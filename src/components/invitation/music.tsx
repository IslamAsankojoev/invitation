"use client";

import { useEffect, useRef, useState } from "react";
import { fadeOutVolume, fragmentOf, fragmentStep } from "@/lib/musicFragment";
import { useGuestLanguage } from "./language";

/** Нарастание громкости при включении и при повторе фрагмента, секунды. */
const FADE_IN = 2;
const FADE_IN_REPEAT = 0.8;
/** Шаг пересчёта громкости и проверки конца фрагмента, мс. */
const TICK_MS = 50;

type Fragment = { start?: number; end?: number | null; loop?: boolean };

/**
 * Музыка приглашения — общая для страницы гостя и превью в редакторе: плавное нарастание громкости, фрагмент
 * песни (music.start/end) с повтором и обязательным плавным затуханием в конце, пауза при сворачивании вкладки,
 * одна играющая песня на странице (остальные плееры замолкают).
 * Громкость — через Web Audio (GainNode): на iPhone audio.volume только для чтения, и затухание там не работало бы.
 * Нет Web Audio — через audio.volume. Повтор делает сам хук (атрибут loop у <audio> не нужен).
 */
export function useInvitationMusic(url: string | null, fragment: Fragment = {}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  /** Музыку включили и не выключали кнопкой — после возврата во вкладку или смены песни она продолжится. */
  const wantMusic = useRef(false);
  const tickTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const gain = useRef<{ ctx: AudioContext; node: GainNode } | null>(null);
  /** Множитель нарастания (0→1) и его скорость в секунду. */
  const fadeIn = useRef({ level: 1, perSecond: 1 / FADE_IN });
  // Свежие настройки фрагмента — без перезапуска таймера на каждую правку в редакторе.
  const fragmentRef = useRef(fragment);
  fragmentRef.current = fragment;

  const bounds = () => fragmentOf(fragmentRef.current, audioRef.current?.duration ?? NaN);

  function setVolume(v: number) {
    const audio = audioRef.current;
    if (gain.current) gain.current.node.gain.setTargetAtTime(v, gain.current.ctx.currentTime, 0.015);
    else if (audio) audio.volume = Math.min(1, Math.max(0, v));
  }

  /** Подключить Web Audio — только из нажатия (play), иначе браузер не даст его запустить. */
  function ensureGain(audio: HTMLAudioElement) {
    if (gain.current || typeof AudioContext === "undefined") return;
    // Файл с другого домена без CORS Web Audio превратил бы в тишину — такие играют без него (через volume).
    if (new URL(audio.currentSrc || audio.src, location.href).origin !== location.origin) return;
    try {
      const ctx = new AudioContext();
      const node = ctx.createGain();
      ctx.createMediaElementSource(audio).connect(node).connect(ctx.destination);
      gain.current = { ctx, node };
      audio.volume = 1;
    } catch {
      gain.current = null; // нет Web Audio — громкость через audio.volume
    }
  }

  function seekToStart(audio: HTMLAudioElement) {
    try {
      audio.currentTime = bounds().start;
    } catch {
      // метаданных ещё нет — перемотаем в onLoadedMetadata
    }
  }

  /** Каждые 50 мс: громкость (нарастание × затухание у конца) и что делать на конце фрагмента. */
  function tick() {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const f = bounds();
    const fade = fadeIn.current;
    fade.level = Math.min(1, fade.level + fade.perSecond * (TICK_MS / 1000));
    setVolume(fade.level * fadeOutVolume(audio.currentTime, f));
    const step = fragmentStep(audio.currentTime, f, !!fragmentRef.current.loop);
    if (step === "restart") {
      fadeIn.current = { level: 0, perSecond: 1 / FADE_IN_REPEAT };
      setVolume(0);
      seekToStart(audio);
    } else if (step === "stop") {
      audio.pause();
      seekToStart(audio);
    }
  }

  // Свернули вкладку — пауза, вернулись — музыка продолжается.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !wantMusic.current) return;
      if (document.hidden) audio.pause();
      else audio.play().catch(() => {});
    };
    // Заиграл другой плеер (например, «Послушать» в редакторе) — замолкаем, чтобы песни не накладывались.
    // Немые ролики (видео-конверт) песне не мешают.
    const onOtherPlay = (e: Event) => {
      const audio = audioRef.current;
      if (!audio || e.target === audio || !(e.target instanceof HTMLMediaElement) || e.target.muted) return;
      wantMusic.current = false;
      audio.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("play", onOtherPlay, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("play", onOtherPlay, true);
      clearInterval(tickTimer.current);
      void gain.current?.ctx.close().catch(() => {});
    };
  }, []);

  // Сменили песню (в редакторе), пока музыка играла, — новая продолжает играть с начала своего фрагмента.
  useEffect(() => {
    if (url && wantMusic.current) audioRef.current?.play().catch(() => {});
  }, [url]);

  /**
   * Включить музыку. from — с какой секунды (редактор фрагмента: «с нового начала», «перед концом», клик по
   * волне); тогда нарастание короткое. Без from — с начала фрагмента, если позиция вне него.
   */
  function play(from?: number) {
    const audio = audioRef.current;
    if (!audio) return;
    wantMusic.current = true;
    // Вызывается из обработчика клика — иначе браузер заблокирует автозапуск (и Web Audio тоже).
    ensureGain(audio);
    void gain.current?.ctx.resume().catch(() => {});
    const f = bounds();
    if (from !== undefined) {
      try {
        audio.currentTime = Math.min(Math.max(from, f.start), Math.max(f.start, f.end - 0.2));
      } catch {
        // метаданных ещё нет
      }
    } else if (audio.currentTime < f.start || audio.currentTime >= f.end - 0.1) seekToStart(audio);
    fadeIn.current = { level: 0, perSecond: 1 / (from !== undefined ? 0.25 : FADE_IN) };
    setVolume(0);
    audio.play().catch(() => setPlaying(false));
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) return play();
    wantMusic.current = false;
    audio.pause();
  }

  const audioProps = {
    ref: audioRef,
    onPlay: () => {
      setPlaying(true);
      clearInterval(tickTimer.current);
      tickTimer.current = setInterval(tick, TICK_MS);
    },
    onPause: () => {
      setPlaying(false);
      clearInterval(tickTimer.current);
    },
    // До загрузки метаданных перемотать нельзя — делаем это, как только длина трека известна.
    onLoadedMetadata: () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime < bounds().start) seekToStart(audio);
    },
    // Конец трека (фрагмент до конца песни): повтор — сначала фрагмента.
    onEnded: () => {
      const audio = audioRef.current;
      if (!audio || !fragmentRef.current.loop || !wantMusic.current) return;
      fadeIn.current = { level: 0, perSecond: 1 / FADE_IN_REPEAT };
      seekToStart(audio);
      audio.play().catch(() => {});
    },
  };
  return { audioProps, playing, play, toggle, audioRef };
}

/** Кнопка-эквалайзер «музыка вкл/выкл»; место на экране задаёт className. */
export function MusicButton({ playing, onClick, className = "" }: { playing: boolean; onClick: () => void; className?: string }) {
  const { t } = useGuestLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? t.musicOff : t.musicOn}
      aria-pressed={playing}
      className={`inv-music z-20 flex h-12 w-12 items-center justify-center gap-[3px] rounded-full border border-[var(--accent)]/60 bg-white/80 text-[var(--accent)] shadow-md backdrop-blur ${playing ? "inv-music-on" : ""} ${className}`}
    >
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" className="inv-music-bar h-[15px] w-[2px] rounded-full bg-current" />
      ))}
    </button>
  );
}
