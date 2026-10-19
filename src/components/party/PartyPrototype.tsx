"use client";

import { useEffect, useState } from "react";
import { findPartyTheme, type PartyThemeId } from "@/lib/party";
import { PassView } from "./PassView";
import type { SceneFonts } from "./scenes";
import { StoryStudio } from "./StoryStudio";

const GUEST = { name: "Айгерим", number: 27 };

export function PartyPrototype({ fonts }: { fonts: SceneFonts }) {
  const [themeId, setThemeId] = useState<PartyThemeId>("neon");
  const [mode, setMode] = useState<"invite" | "going">("invite");
  const [view, setView] = useState<"story" | "pass">("story");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const theme = findPartyTheme(themeId);

  if (view === "pass")
    return (
      <PassView
        theme={theme}
        guest={GUEST}
        passUrl={`${origin}/p/${theme.id}-${GUEST.number}`}
        onBack={() => setView("story")}
        onShareGoing={() => {
          setMode("going");
          setView("story");
        }}
      />
    );

  return (
    <StoryStudio
      theme={theme}
      onTheme={setThemeId}
      mode={mode}
      onMode={setMode}
      fonts={fonts}
      guest={GUEST}
      inviteUrl={`${origin}/i/${theme.id}-party`}
      onOpenPass={() => setView("pass")}
    />
  );
}
