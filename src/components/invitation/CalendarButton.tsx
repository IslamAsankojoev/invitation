"use client";

import { generateIcs } from "@/lib/ics";

type Props = { title: string; start: string; location?: string; light?: boolean };

export function CalendarButton({ title, start, location, light = false }: Props) {
  function download() {
    const blob = new Blob([generateIcs({ title, start, location })], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitation.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inv-btn-outline mt-10"
      style={light ? { borderColor: "rgba(255,255,255,.6)", color: "#fff" } : undefined}
    >
      Добавить в календарь
    </button>
  );
}
