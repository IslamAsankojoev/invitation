"use client";

import { useEffect, useRef, useState } from "react";

/** Нарастание громкости: 25 шагов по 80 мс ≈ 2 с. */
const FADE_STEPS = 25;
const FADE_STEP_MS = 80;

/**
 * Музыка приглашения — общая для страницы гостя и превью в редакторе: плавное нарастание громкости,
 * пауза при сворачивании вкладки, одна играющая песня на странице (остальные плееры замолкают).
 */
export function useInvitationMusic(url: string | null) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  /** Музыку включили и не выключали кнопкой — после возврата во вкладку или смены песни она продолжится. */
  const wantMusic = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // Свернули вкладку — пауза, вернулись — музыка продолжается.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !wantMusic.current) return;
      if (document.hidden) audio.pause();
      else audio.play().catch(() => {});
    };
    // Заиграл другой плеер (например, «Послушать» в редакторе) — замолкаем, чтобы песни не накладывались.
    const onOtherPlay = (e: Event) => {
      const audio = audioRef.current;
      if (!audio || e.target === audio || !(e.target instanceof HTMLMediaElement)) return;
      wantMusic.current = false;
      clearInterval(fadeTimer.current);
      audio.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("play", onOtherPlay, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("play", onOtherPlay, true);
      clearInterval(fadeTimer.current);
    };
  }, []);

  // Сменили песню (в редакторе), пока музыка играла, — новая продолжает играть.
  useEffect(() => {
    if (url && wantMusic.current) audioRef.current?.play().catch(() => {});
  }, [url]);

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    wantMusic.current = true;
    // Вызывается из обработчика клика — иначе браузер заблокирует автозапуск.
    // Громкость нарастает плавно (на iPhone её задаёт только система — там музыка просто включится).
    audio.volume = 0;
    audio.play().catch(() => setPlaying(false));
    clearInterval(fadeTimer.current);
    fadeTimer.current = setInterval(() => {
      audio.volume = Math.min(1, audio.volume + 1 / FADE_STEPS);
      if (audio.volume >= 1) clearInterval(fadeTimer.current);
    }, FADE_STEP_MS);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) return play();
    wantMusic.current = false;
    clearInterval(fadeTimer.current);
    audio.pause();
  }

  const audioProps = {
    ref: audioRef,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
  };
  return { audioProps, playing, play, toggle };
}

/** Кнопка-эквалайзер «музыка вкл/выкл»; место на экране задаёт className. */
export function MusicButton({ playing, onClick, className = "" }: { playing: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? "Выключить музыку" : "Включить музыку"}
      aria-pressed={playing}
      className={`inv-music z-20 flex h-12 w-12 items-center justify-center gap-[3px] rounded-full border border-[var(--accent)]/60 bg-white/80 text-[var(--accent)] shadow-md backdrop-blur ${playing ? "inv-music-on" : ""} ${className}`}
    >
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" className="inv-music-bar h-[15px] w-[2px] rounded-full bg-current" />
      ))}
    </button>
  );
}
