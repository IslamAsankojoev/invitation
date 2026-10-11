"use client";

import { Check, Info, Loader2, Music, Pause, Play, Scissors, Upload, VolumeX } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CUSTOM_MUSIC_ENABLED, findTrack, musicTracks } from "@/lib/music";
import { formatTime, fragmentOf, isWholeTrack } from "@/lib/musicFragment";
import { useInvitationMusic } from "@/components/invitation/music";
import type { InvitationData } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useUploadFile } from "./api";
import { Group } from "./controls";
import { WaveformTrimmer } from "./WaveformTrimmer";

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
    // Заиграла музыка в превью — прослушивание останавливаем, чтобы песни не накладывались.
    const onOtherPlay = (e: Event) => {
      if (!el || e.target === el || !(e.target instanceof HTMLMediaElement)) return;
      el.pause();
      setPlaying(null);
    };
    document.addEventListener("play", onOtherPlay, true);
    return () => {
      document.removeEventListener("play", onOtherPlay, true);
      el?.pause();
    };
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
          <FieldLabel htmlFor={loopId}>{isWholeTrack(data.music) ? "Повторять по кругу" : "Повторять фрагмент по кругу"}</FieldLabel>
        </Field>
      )}

      {url && <FragmentEditor music={data.music} url={url} onChange={setMusic} />}

      {CUSTOM_MUSIC_ENABLED && <CustomUpload onUploaded={(u) => setMusic({ url: u })} />}
    </Group>
  );
}

/**
 * Фрагмент песни: начало и конец двумя ручками, «Послушать фрагмент» (как услышит гость: с начала фрагмента,
 * с затуханием в конце) и «Весь трек». Длительность трека узнаём по метаданным — до этого ползунка нет.
 */
function FragmentEditor({ music, url, onChange }: { music: InvitationData["music"]; url: string; onChange: (patch: Partial<InvitationData["music"]>) => void }) {
  const [duration, setDuration] = useState<number | null>(null);
  useEffect(() => {
    setDuration(null);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => Number.isFinite(probe.duration) && setDuration(probe.duration);
    probe.src = url;
    return () => {
      probe.onloadedmetadata = null;
      probe.removeAttribute("src");
    };
  }, [url]);
  // Прослушивание — тем же плеером, что у гостя, но без повтора: играет фрагмент и затухает в конце.
  const preview = useInvitationMusic(url, { start: music.start, end: music.end, loop: false });
  // Свежие границы — для перезапуска после правки (обработчик клавиш срабатывает по таймеру, позже рендера).
  const latest = useRef(music);
  latest.current = music;

  // Линия воспроизведения: пока играет — каждый кадр; после остановки остаётся на месте.
  const [playhead, setPlayhead] = useState<number | null>(null);
  useEffect(() => setPlayhead(null), [url]);
  useEffect(() => {
    if (!preview.playing) return;
    let frame = requestAnimationFrame(function step() {
      const audio = preview.audioRef.current;
      if (audio) setPlayhead(audio.currentTime);
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [preview.playing, preview.audioRef]);

  /** Отпустили ручку: начало — играть с нового начала, конец — последние 3 с перед ним (слышно, где обрыв). */
  function replay(which: "start" | "end") {
    if (!duration) return;
    const f = fragmentOf(latest.current, duration);
    preview.play(which === "start" ? f.start : Math.max(f.start, f.end - 3));
  }

  const whole = isWholeTrack(music);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <audio {...preview.audioProps} src={url} crossOrigin="anonymous" preload="metadata" data-testid="fragment-preview" className="hidden" />
      <div className="flex items-center gap-2">
        <Scissors aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Фрагмент песни</span>
        {duration && (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground" data-testid="fragment-range">
            {(() => {
              const f = fragmentOf(music, duration);
              return `${formatTime(f.start)} — ${formatTime(f.end)} · ${formatTime(f.end - f.start)}`;
            })()}
          </span>
        )}
      </div>
      {duration ? (
        <WaveformTrimmer
          url={url}
          duration={duration}
          fragment={fragmentOf(music, duration)}
          playhead={playhead}
          onChange={onChange}
          onCommit={replay}
          onSeek={(t) => preview.play(t)}
          playing={preview.playing}
          onTogglePlay={preview.toggle}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Загружаю песню…</p>
      )}
      <p className="text-xs text-muted-foreground">
        Перетащите края, чтобы выбрать кусок; нажмите на волну — играть с этого места. Гость услышит только этот кусок;
        в конце музыка всегда плавно затихает{music.loop ? ", потом фрагмент играет снова" : ""}.
      </p>
      <Button type="button" variant="ghost" size="sm" className="self-start" disabled={whole} onClick={() => onChange({ start: 0, end: null })}>
        Весь трек
      </Button>
    </div>
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
