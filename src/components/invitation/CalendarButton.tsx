"use client";

import type { MouseEvent } from "react";
import { googleCalendarUrl, invitationEvent } from "@/lib/ics";
import type { BlockContext } from "./blocks/types";

type Props = { ctx: BlockContext; light?: boolean };

/** iPhone, iPad (iPadOS выдаёт себя за Mac) и Mac открывают .ics по ссылке сразу в Календаре. */
function isApple() {
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

/**
 * «Добавить в календарь»: на устройствах Apple — ссылка на `/i/<slug>/calendar.ics` (системное окно «Добавить»),
 * на остальных — Google Календарь с заполненными полями (на Android открывается приложение).
 */
export function CalendarButton({ ctx, light = false }: Props) {
  const href = `/i/${ctx.slug}/calendar.ics`;

  function open(e: MouseEvent<HTMLAnchorElement>) {
    if (ctx.preview) return e.preventDefault();
    if (isApple()) return;
    const event = invitationEvent(ctx.data, `${window.location.origin}/i/${ctx.slug}`);
    if (!event) return;
    e.preventDefault();
    window.open(googleCalendarUrl(event), "_blank", "noopener");
  }

  return (
    <a
      href={href}
      onClick={open}
      className="inv-btn-outline mt-10"
      style={light ? { borderColor: "rgba(255,255,255,.6)", color: "#fff" } : undefined}
    >
      Добавить в календарь
    </a>
  );
}
