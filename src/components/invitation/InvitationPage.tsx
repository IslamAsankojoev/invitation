"use client";

import { useEffect, useRef, useState } from "react";
import { findBlock } from "@/lib/blocks";
import { describeDate } from "@/lib/calendar";
import type { InvitationData } from "@/lib/schema";
import { themeStyle } from "@/lib/theme";
import { DecorLayer } from "./DecorLayer";
import { Envelope, INTRO_LEAVE_MS } from "./Envelope";
import { InvitationView } from "./InvitationView";
import { prefersReducedMotion } from "./motion";

/** Нарастание громкости: 25 шагов по 80 мс ≈ 2 с. */
const FADE_STEPS = 25;
const FADE_STEP_MS = 80;

/** Публичная страница: конверт, музыка, декор и само приглашение. */
export function InvitationPage({ data, slug }: { data: InvitationData; slug: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /** Гость нажал «Открыть приглашение»: анимации сайта стартуют, заставка растворяется. */
  const [opened, setOpened] = useState(false);
  const [envelope, setEnvelope] = useState(true);
  const [playing, setPlaying] = useState(false);
  /** Гость хочет музыку (не выключал её кнопкой) — тогда после возврата во вкладку она продолжится. */
  const wantMusic = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const musicUrl = data.music.url;
  const hero = findBlock(data, "hero");

  // Пока конверт не открыт, страница под ним не прокручивается.
  useEffect(() => {
    document.documentElement.style.overflow = opened ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [opened]);

  // Свернули вкладку — пауза, вернулись — музыка продолжается.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !wantMusic.current) return;
      if (document.hidden) audio.pause();
      else audio.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(fadeTimer.current);
    };
  }, []);

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

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) return play();
    wantMusic.current = false;
    clearInterval(fadeTimer.current);
    audio.pause();
  }

  function open() {
    if (opened) return;
    if (musicUrl) play();
    window.scrollTo(0, 0);
    setOpened(true);
    setTimeout(() => setEnvelope(false), prefersReducedMotion() ? 0 : INTRO_LEAVE_MS[data.theme.envelope.style]);
  }

  return (
    <div style={themeStyle(data.theme)} className="min-h-svh bg-[var(--bg)]">
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop={data.music.loop}
          preload="auto"
          data-testid="music"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      <InvitationView data={data} slug={slug} motion={opened ? "on" : "paused"} />
      <DecorLayer decor={data.theme.decor} />

      {envelope && (
        <Envelope
          names={hero?.names ?? ""}
          label={hero?.label}
          date={hero ? describeDate(hero.date).dotted : undefined}
          ornament={data.theme.envelope.ornament}
          variant={data.theme.envelope.style}
          hasMusic={!!musicUrl}
          leaving={opened}
          onOpen={open}
        />
      )}

      {musicUrl && opened && (
        <button
          type="button"
          onClick={toggleMusic}
          aria-label={playing ? "Выключить музыку" : "Включить музыку"}
          aria-pressed={playing}
          className={`inv-music fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50vw-215px+1rem))] z-20 flex h-12 w-12 items-center justify-center gap-[3px] rounded-full border border-[var(--accent)]/60 bg-white/80 text-[var(--accent)] shadow-md backdrop-blur ${playing ? "inv-music-on" : ""}`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} aria-hidden="true" className="inv-music-bar h-[15px] w-[2px] rounded-full bg-current" />
          ))}
        </button>
      )}
    </div>
  );
}
