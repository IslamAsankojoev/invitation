"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { computePeaks, formatClock, timeTicks, type Fragment, FRAGMENT_STEP, moveHandle, wavePath } from "@/lib/musicFragment";
import { cn } from "@/lib/utils";

/** Точек волны: плотно, чтобы контур выглядел сплошным. */
const BARS = 240;

/** Волна песни по url: декодируем mp3 через Web Audio и считаем пики. Кэш — одна песня декодируется один раз. */
const peaksCache = new Map<string, Promise<number[] | null>>();
function loadPeaks(url: string): Promise<number[] | null> {
  let task = peaksCache.get(url);
  if (!task) {
    task = (async () => {
      if (typeof OfflineAudioContext === "undefined") return null;
      try {
        const data = await (await fetch(url)).arrayBuffer();
        const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
        return computePeaks(audio.getChannelData(0), BARS);
      } catch {
        return null; // не вышло — волна будет ровной, выбор фрагмента всё равно работает
      }
    })();
    peaksCache.set(url, task);
  }
  return task;
}

type Props = {
  url: string;
  duration: number;
  fragment: Fragment;
  /** Позиция воспроизведения, секунды; null — линию не показываем. */
  playhead: number | null;
  onChange: (patch: { start: number; end: number | null }) => void;
  /** Ручку отпустили (или клавишами перестали двигать) — какую. */
  onCommit: (which: "start" | "end") => void;
  /** Нажали по волне внутри фрагмента — играть с этого места. */
  onSeek: (time: number) => void;
  playing: boolean;
  /** Кнопка ▶/❚❚ под волной. */
  onTogglePlay: () => void;
};

/**
 * Обрезка песни как в аудиоредакторах (clideo.com/cut-audio), в цветах редактора (токены shadcn): сплошная
 * симметричная волна, выбранный кусок цвета primary в рамке того же цвета (её края — ручки), вне его — приглушённая
 * волна, шкала времени, линия воспроизведения; под волной — ▶ и «текущее / длина». Ручки — role="slider": стрелки ±0.5 с, PageUp/PageDown ±5 с, Home/End.
 */
export function WaveformTrimmer({ url, duration, fragment, playhead, onChange, onCommit, onSeek, playing, onTogglePlay }: Props) {
  const clipId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const keyCommit = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    let alive = true;
    setPeaks(null);
    void loadPeaks(url).then((p) => alive && setPeaks(p));
    return () => {
      alive = false;
    };
  }, [url]);
  useEffect(() => () => clearTimeout(keyCommit.current), []);

  const pct = (t: number) => `${(Math.min(Math.max(t, 0), duration) / duration) * 100}%`;
  const timeAt = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * duration;
  };

  function grab(which: "start" | "end") {
    return (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(which);
    };
  }
  function drag(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(moveHandle(fragment, dragging, timeAt(e.clientX), duration));
  }
  function release() {
    if (!dragging) return;
    onCommit(dragging);
    setDragging(null);
  }

  function keys(which: "start" | "end") {
    return (e: KeyboardEvent<HTMLDivElement>) => {
      const now = which === "start" ? fragment.start : fragment.end;
      const step = { ArrowLeft: -FRAGMENT_STEP, ArrowDown: -FRAGMENT_STEP, ArrowRight: FRAGMENT_STEP, ArrowUp: FRAGMENT_STEP, PageUp: 5, PageDown: -5 }[e.key];
      const to = step !== undefined ? now + step : e.key === "Home" ? 0 : e.key === "End" ? duration : null;
      if (to === null) return;
      e.preventDefault();
      onChange(moveHandle(fragment, which, to, duration));
      // Клавишами двигают по шагу — перезапуск, когда перестали нажимать.
      clearTimeout(keyCommit.current);
      keyCommit.current = setTimeout(() => onCommit(which), 400);
    };
  }

  const handle = (which: "start" | "end") => {
    const t = which === "start" ? fragment.start : fragment.end;
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={which === "start" ? "Начало фрагмента" : "Конец фрагмента"}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={t}
        aria-valuetext={formatClock(t)}
        onPointerDown={grab(which)}
        onKeyDown={keys(which)}
        // Край жёлтой рамки: толстая полоса с «хватом»; зона нажатия шире полосы — удобно пальцем.
        className={cn(
          "absolute -inset-y-[3px] z-20 flex w-6 cursor-ew-resize touch-none items-center outline-none focus-visible:[&>span]:ring-3 focus-visible:[&>span]:ring-ring/50",
          which === "start" ? "-translate-x-[calc(100%-10px)] justify-end" : "-translate-x-[10px] justify-start",
        )}
        style={{ left: pct(t) }}
      >
        <span
          className={cn("flex h-full w-2.5 items-center justify-center bg-primary", which === "start" ? "rounded-l-md" : "rounded-r-md")}
        >
          <span className="h-4 w-[3px] rounded-full bg-primary-foreground/70" />
        </span>
      </div>
    );
  };

  const path = wavePath(peaks ?? Array.from({ length: BARS }, () => 0.35));
  const current = playhead ?? fragment.start;

  return (
    <div className="rounded-xl bg-muted p-3 text-foreground">
      <div
        ref={box}
        data-testid="waveform"
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={(e) => {
          if (dragging) return;
          const t = timeAt(e.clientX);
          if (t >= fragment.start && t <= fragment.end) onSeek(t);
        }}
        className="relative h-24 cursor-pointer touch-none select-none rounded-md bg-background"
      >
        {/* Волна: серая целиком, поверх — синяя, обрезанная по фрагменту. */}
        <svg aria-hidden="true" viewBox={`0 0 ${BARS} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <clipPath id={clipId}>
              <rect x={(fragment.start / duration) * BARS} y="0" width={((fragment.end - fragment.start) / duration) * BARS} height="100" />
            </clipPath>
          </defs>
          <path d={path} className="fill-muted-foreground/35" />
          <path d={path} className="fill-primary" clipPath={`url(#${clipId})`} />
        </svg>
        {/* Шкала времени: риски на волне, подписи — под ней (на волне цвета primary они бы не читались). */}
        {timeTicks(duration).map((t) => (
          <span key={t} aria-hidden="true" className="pointer-events-none absolute top-0 h-1.5 w-px bg-foreground/20" style={{ left: pct(t) }} />
        ))}
        {/* Затемнение вне фрагмента и жёлтая рамка выбранного куска. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 rounded-l-md bg-background/55" style={{ width: pct(fragment.start) }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 rounded-r-md bg-background/55" style={{ left: pct(fragment.end) }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-[3px] border-y-[3px] border-primary"
          style={{ left: pct(fragment.start), right: `calc(100% - ${pct(fragment.end)})` }}
        />
        {/* Где сейчас воспроизведение. */}
        {playhead !== null && (
          <div
            aria-hidden="true"
            data-testid="playhead"
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-foreground"
            style={{ left: pct(playhead) }}
          />
        )}
        {handle("start")}
        {handle("end")}
      </div>
      <div aria-hidden="true" className="relative mt-1 h-3">
        {timeTicks(duration).map((t) => (
          <span key={t} className="absolute -translate-x-1/2 text-[9px] tabular-nums text-muted-foreground" style={{ left: pct(t) }}>
            {formatClock(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-3 items-center">
        <span />
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Остановить" : "Послушать фрагмент"}
          className="justify-self-center rounded-full p-2 text-foreground/80 outline-none transition hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:p-3"
        >
          {playing ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
        </button>
        <span className="justify-self-end text-xs tabular-nums" data-testid="fragment-clock">
          <span className="text-muted-foreground">{formatClock(current)}</span>
          <span className="text-muted-foreground/60"> / </span>
          <span>{formatClock(duration)}</span>
        </span>
      </div>
    </div>
  );
}
