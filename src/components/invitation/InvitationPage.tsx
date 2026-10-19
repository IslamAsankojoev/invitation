"use client";

import { useEffect, useRef, useState } from "react";
import { sendEvent, visitorId } from "@/lib/beacon";
import { findBlock } from "@/lib/blocks";
import { describeDate } from "@/lib/calendar";
import type { InvitationData } from "@/lib/schema";
import { themeStyle } from "@/lib/theme";
import { DecorLayer } from "./DecorLayer";
import { Envelope, INTRO_LEAVE_MS } from "./Envelope";
import { InvitationView } from "./InvitationView";
import { GuestLanguageProvider } from "./language";
import { prefersReducedMotion } from "./motion";
import { MusicButton, useInvitationMusic } from "./music";

/** Публичная страница: конверт, музыка, декор и само приглашение. demo — показ шаблона (ответы не отправляются). */
export function InvitationPage({ data, slug, demo = false }: { data: InvitationData; slug: string; demo?: boolean }) {
  /** Гость нажал «Открыть приглашение»: анимации сайта стартуют, заставка растворяется. */
  const [opened, setOpened] = useState(false);
  const [envelope, setEnvelope] = useState(true);
  const musicUrl = data.music.url;
  const hero = findBlock(data, "hero");
  const music = useInvitationMusic(musicUrl, data.music);

  // Аналитика: гость открыл страницу. Ссылку в превью WhatsApp/Telegram их роботы не считают — JS они не выполняют.
  // Ref — против двойного эффекта StrictMode. На показе шаблонов (demo) приглашения в базе нет.
  const viewSent = useRef(false);
  useEffect(() => {
    if (demo || viewSent.current) return;
    viewSent.current = true;
    sendEvent({ name: "guest_view", slug, visitorId: visitorId() });
  }, [demo, slug]);

  // Пока конверт не открыт, страница под ним не прокручивается.
  useEffect(() => {
    document.documentElement.style.overflow = opened ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [opened]);

  const videoIntro = data.theme.envelope.style === "video";

  function open() {
    if (opened) return;
    if (!demo) sendEvent({ name: "envelope_opened", slug, visitorId: visitorId() });
    // У видео-конверта музыка включилась ещё при нажатии (onStart), сейчас ролик доиграл.
    if (musicUrl && !videoIntro) music.play();
    window.scrollTo(0, 0);
    setOpened(true);
    setTimeout(() => setEnvelope(false), prefersReducedMotion() ? 0 : INTRO_LEAVE_MS[data.theme.envelope.style]);
  }

  return (
    <GuestLanguageProvider lang={data.language} eventType={data.eventType}>
    <div style={themeStyle(data.theme)} lang={data.language} data-inv-lang={data.language} className="min-h-svh bg-[var(--bg)]">
      {musicUrl && (
        <audio
          {...music.audioProps}
          src={musicUrl}
          preload="auto"
          crossOrigin="anonymous"
          data-testid="music"
          // Фрагмент и повтор — для записи видео со звуком (scripts/template-video.mjs собирает дорожку как у гостя).
          data-start={data.music.start}
          data-end={data.music.end ?? undefined}
          data-loop={data.music.loop ? "" : undefined}
        />
      )}

      <InvitationView data={data} slug={slug} demo={demo} motion={opened ? "on" : "paused"} />
      <DecorLayer decor={data.theme.decor} />

      {envelope && (
        <Envelope
          names={hero?.names ?? ""}
          label={hero?.label}
          date={hero ? describeDate(hero.date).dotted : undefined}
          ornament={data.theme.envelope.ornament}
          variant={data.theme.envelope.style}
          video={data.theme.envelope.video}
          poster={data.theme.envelope.poster}
          hasMusic={!!musicUrl}
          leaving={opened}
          onOpen={open}
          onStart={() => musicUrl && music.play()}
        />
      )}

      {musicUrl && opened && (
        <MusicButton
          playing={music.playing}
          onClick={music.toggle}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50vw-215px+1rem))]"
        />
      )}
    </div>
    </GuestLanguageProvider>
  );
}
