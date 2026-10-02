"use client";

import { Check, Info, Loader2, Music, Pause, Play, Upload, VolumeX } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CUSTOM_MUSIC_ENABLED, findTrack, musicTracks } from "@/lib/music";
import type { InvitationData } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useUploadFile } from "./api";
import { Group } from "./controls";

type Props = { data: InvitationData; onChange: (data: InvitationData) => void };

/** Строка выбора песни: выбрать — нажатием, послушать — кнопкой справа. */
const row =
  "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-primary/10";

/**
 * Музыка приглашения — одна из встроенных песен (lib/music.ts). Своя загрузка пока выключена (CUSTOM_MUSIC_ENABLED),
 * чтобы не копить mp3 в хранилище. Песня, загруженная до ограничения, остаётся и показывается отдельной строкой.
 */
export function MusicPanel({ data, onChange }: Props) {
  const loopId = useId();
  const setMusic = (patch: Partial<InvitationData["music"]>) => onChange({ ...data, music: { ...data.music, ...patch } });
  const url = data.music.url;
  const custom = url && !findTrack(url) ? url : null;

  // Прослушивание в редакторе: один плеер на панель, играет одна песня.
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    const el = audio.current;
    return () => el?.pause();
  }, []);
  function toggle(src: string) {
    const el = audio.current;
    if (!el) return;
    if (playing === src) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.src = src;
    void el.play()?.catch(() => setPlaying(null));
    setPlaying(src);
  }

  const songs = [
    ...musicTracks.map(({ src, title, artist }) => ({ src, title, artist })),
    ...(custom ? [{ src: custom, title: "Своя песня", artist: "загружена раньше" }] : []),
  ];

  return (
    <Group title="Музыка">
      <FieldDescription>Музыка начнёт играть, когда гость нажмёт «Открыть приглашение».</FieldDescription>
      {!CUSTOM_MUSIC_ENABLED && (
        <Alert>
          <Info />
          <AlertDescription>Загрузить свою музыку пока нельзя — выберите одну из песен ниже.</AlertDescription>
        </Alert>
      )}

      <audio ref={audio} data-testid="music-preview" onEnded={() => setPlaying(null)} className="hidden" />
      <ul className="flex flex-col gap-1" aria-label="Песни">
        {songs.map((s) => (
          <li key={s.src} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={url === s.src}
              aria-label={`Песня «${s.title}» — ${s.artist}`}
              onClick={() => setMusic({ url: s.src })}
              className={row}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                  url === s.src && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {url === s.src ? <Check className="size-4" /> : <Music className="size-4 text-muted-foreground" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.artist}</span>
              </span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${playing === s.src ? "Остановить" : "Послушать"} «${s.title}»`}
              onClick={() => toggle(s.src)}
            >
              {playing === s.src ? <Pause /> : <Play />}
            </Button>
          </li>
        ))}
        <li className="flex">
          <button type="button" aria-pressed={!url} onClick={() => setMusic({ url: null })} className={row}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
              <VolumeX className="size-4" />
            </span>
            Без музыки
          </button>
        </li>
      </ul>

      {url && (
        <Field orientation="horizontal">
          <Switch id={loopId} checked={data.music.loop} onCheckedChange={(loop) => setMusic({ loop })} />
          <FieldLabel htmlFor={loopId}>Повторять по кругу</FieldLabel>
        </Field>
      )}

      {CUSTOM_MUSIC_ENABLED && <CustomUpload onUploaded={(u) => setMusic({ url: u })} />}
    </Group>
  );
}

/** Своя песня (mp3 до 10 МБ). Выключено флагом CUSTOM_MUSIC_ENABLED — вернуть, когда будет хранилище и тарифы. */
function CustomUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadFile = useUploadFile();

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadFile(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="outline" className={cn("self-start", busy && "pointer-events-none opacity-60")}>
        <label>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {busy ? "Загружаю…" : "Загрузить свой mp3"}
          <input
            type="file"
            accept="audio/mpeg"
            className="sr-only"
            aria-label="Загрузить mp3"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </Button>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
