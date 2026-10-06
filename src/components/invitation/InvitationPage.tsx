"use client";

import { useEffect, useState } from "react";
import { findBlock } from "@/lib/blocks";
import { describeDate } from "@/lib/calendar";
import type { InvitationData } from "@/lib/schema";
import { themeStyle } from "@/lib/theme";
import { DecorLayer } from "./DecorLayer";
import { Envelope, INTRO_LEAVE_MS } from "./Envelope";
import { InvitationView } from "./InvitationView";
import { prefersReducedMotion } from "./motion";
import { MusicButton, useInvitationMusic } from "./music";

/** Публичная страница: конверт, музыка, декор и само приглашение. */
export function InvitationPage({ data, slug }: { data: InvitationData; slug: string }) {
  /** Гость нажал «Открыть приглашение»: анимации сайта стартуют, заставка растворяется. */
  const [opened, setOpened] = useState(false);
  const [envelope, setEnvelope] = useState(true);
  const musicUrl = data.music.url;
  const hero = findBlock(data, "hero");
  const music = useInvitationMusic(musicUrl);

  // Пока конверт не открыт, страница под ним не прокручивается.
  useEffect(() => {
    document.documentElement.style.overflow = opened ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [opened]);

  function open() {
    if (opened) return;
    if (musicUrl) music.play();
    window.scrollTo(0, 0);
    setOpened(true);
    setTimeout(() => setEnvelope(false), prefersReducedMotion() ? 0 : INTRO_LEAVE_MS[data.theme.envelope.style]);
  }

  return (
    <div style={themeStyle(data.theme)} className="min-h-svh bg-[var(--bg)]">
      {musicUrl && (
        <audio
          {...music.audioProps}
          src={musicUrl}
          loop={data.music.loop}
          preload="auto"
          data-testid="music"
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
        <MusicButton
          playing={music.playing}
          onClick={music.toggle}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50vw-215px+1rem))]"
        />
      )}
    </div>
  );
}
