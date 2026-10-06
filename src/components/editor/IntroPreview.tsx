"use client";

import { useEffect, useRef, useState } from "react";
import { Envelope, INTRO_LEAVE_MS } from "@/components/invitation/Envelope";
import { prefersReducedMotion } from "@/components/invitation/motion";
import { findBlock } from "@/lib/blocks";
import { describeDate } from "@/lib/calendar";
import type { InvitationData } from "@/lib/schema";
import { themeStyle } from "@/lib/theme";

/** Заставка поверх превью в рамке телефона: проигрывается целиком, по нажатию на печать уходит и закрывается. */
export function IntroPreview({ data, onOpen, onClose }: { data: InvitationData; onOpen?: () => void; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hero = findBlock(data, "hero");
  const style = data.theme.envelope.style;

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="absolute inset-0 z-30" style={themeStyle(data.theme)} data-testid="intro-preview">
      <Envelope
        contained
        names={hero?.names ?? ""}
        label={hero?.label}
        date={hero ? describeDate(hero.date).dotted : undefined}
        ornament={data.theme.envelope.ornament}
        hasMusic={!!data.music.url}
        variant={style}
        leaving={leaving}
        onOpen={() => {
          onOpen?.(); // нажатие на печать — жест пользователя: тут можно включить музыку, как у гостя
          setLeaving(true);
          timer.current = setTimeout(onClose, prefersReducedMotion() ? 0 : INTRO_LEAVE_MS[style]);
        }}
      />
    </div>
  );
}
