"use client";

import { ArrowLeft, ScanLine, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { partyDate, passNumber, type PartyTheme, type PartyThemeId } from "@/lib/party";
import styles from "./party.module.css";

type Verdict = "idle" | "scanning" | "ok" | "used";

type Props = {
  theme: PartyTheme;
  guest: { name: string; number: number };
  passUrl: string;
  onBack: () => void;
  onShareGoing: () => void;
};

/** Вид пропуска по теме: фон карточки, шрифт названия, цвета живой рамки. */
const looks: Record<PartyThemeId, { bg: string; ink: string; title: React.CSSProperties; live: [string, string] }> = {
  neon: {
    bg: "linear-gradient(160deg, #2a0b40 0%, #05030a 62%)",
    ink: "#f4f1ff",
    title: { fontFamily: "var(--font-party-display)", fontWeight: 900, letterSpacing: "-0.01em" },
    live: ["#c6ff00", "#ff2bd6"],
  },
  disco: {
    bg: "linear-gradient(160deg, #6a1460 0%, #1a0423 70%)",
    ink: "#fff3fb",
    title: { fontFamily: "var(--font-party-mono)" },
    live: ["#ff7ac8", "#ffd36e"],
  },
  masquerade: {
    bg: "linear-gradient(160deg, #33281a 0%, #070605 70%)",
    ink: "#f6ead0",
    title: { fontFamily: "var(--font-party-serif)", fontStyle: "italic", fontWeight: 700 },
    live: ["#d9b36a", "#fff1c9"],
  },
  y2k: {
    bg: "linear-gradient(160deg, #ffffff 0%, #e6dcff 50%, #ffd6ea 100%)",
    ink: "#1b1340",
    title: { fontFamily: "var(--font-party-mono)" },
    live: ["#7b5cff", "#ff5fa2"],
  },
};

const clock = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function PassView({ theme, guest, passUrl, onBack, onShareGoing }: Props) {
  const look = looks[theme.id];
  const ev = theme.event;
  const d = partyDate(ev.date);
  const [now, setNow] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [checkedAt, setCheckedAt] = useState("");
  const scans = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0, at: 0 });

  // Часы идут каждую секунду — вместе с переливом это отличает живой пропуск от скриншота.
  useEffect(() => {
    setNow(clock());
    const id = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(id);
  }, []);

  // Наклон карточки за пальцем/мышью; без касаний карточка сама медленно покачивается — голограмма живая.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let rx = 0;
    let ry = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const idle = t - pointer.current.at > 1500;
      const target = reduced ? { x: 0, y: 0 } : idle ? { x: Math.sin(t / 1400) * 5, y: Math.cos(t / 1900) * 8 } : pointer.current;
      const k = 1 - Math.exp(-dt * 8);
      rx += (target.x - rx) * k;
      ry += (target.y - ry) * k;
      if (tiltRef.current) tiltRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (holoRef.current) holoRef.current.style.backgroundPosition = `${50 + ry * 5}% ${50 + rx * 5}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function onPointerMove(e: React.PointerEvent) {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointer.current = { x: -ny * 12, y: nx * 14, at: performance.now() };
  }

  /** Демо проверки на входе: первое сканирование пускает, повторное — нет (пропуск одноразовый). */
  function scan() {
    if (verdict === "used") {
      scans.current = 0;
      setVerdict("idle");
      return;
    }
    setVerdict("scanning");
    const flipBack = verdict === "ok" ? 600 : 0;
    setTimeout(() => {
      scans.current += 1;
      if (scans.current === 1) setCheckedAt(clock());
      setVerdict(scans.current === 1 ? "ok" : "used");
    }, flipBack + 900);
  }

  const flipped = verdict === "ok" || verdict === "used";
  const muted = theme.id === "y2k" ? "rgba(27,19,64,0.62)" : "rgba(255,255,255,0.6)";

  return (
    <div className={styles.passStage} style={{ "--stage-bg": theme.colors.stage, "--stage-glow": theme.colors.accent2 } as React.CSSProperties}>
      <div className={styles.passTop}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Сторис
        </button>
        <span className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Ваш пропуск</span>
      </div>

      <div
        ref={sceneRef}
        className={styles.passScene}
        style={{ "--pass-glow": `linear-gradient(135deg, ${look.live[0]}, ${look.live[1]})` } as React.CSSProperties}
        onPointerMove={onPointerMove}
      >
        <div ref={tiltRef} className={styles.passTilt}>
          <div className={styles.passCard} data-flipped={flipped || undefined}>
            <article
              className={`${styles.passFace} ${styles.passFront}`}
              style={{ background: look.bg, color: look.ink, aspectRatio: "340 / 620" }}
              aria-label={`Пропуск ${guest.name}, номер ${passNumber(guest.number, ev.capacity)}`}
              aria-hidden={flipped}
            >
              <div ref={holoRef} className={styles.holo} aria-hidden="true" />
              <div className="relative flex h-[64%] flex-col p-[22px] pb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: theme.colors.accent }}>
                    {ev.kicker}
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider" style={{ background: theme.colors.accent, color: theme.id === "y2k" ? "#fff" : "#0b0b0f" }}>
                    VIP · +1
                  </span>
                </div>
                <h2 className="mt-4 text-[38px] leading-[0.95] whitespace-pre-line" style={look.title}>
                  {ev.title}
                </h2>
                <p className="mt-2 text-[13px]" style={{ color: muted }}>
                  {ev.host}
                </p>
                <dl className="mt-auto grid grid-cols-3 gap-2 text-[13px]">
                  {[
                    ["Дата", `${d.dayMonth} · ${d.weekday}`],
                    ["Начало", d.time],
                    ["Место", ev.city],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: muted }}>
                        {k}
                      </dt>
                      <dd className="mt-0.5 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className={styles.perforation} aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex h-[36%] items-center gap-3 px-[22px] pb-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: muted }}>
                    Гость
                  </span>
                  <span className="text-lg leading-tight font-bold">{guest.name}</span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: theme.colors.accent }}>
                    № {passNumber(guest.number, ev.capacity)}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-[11px] font-semibold" style={{ color: muted }}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    <span className="tabular-nums">{now || "··:··:··"}</span>
                  </span>
                </div>
                <div className={styles.qrFrame} style={{ "--live-a": look.live[0], "--live-b": look.live[1] } as React.CSSProperties}>
                  <div className={styles.qrInner}>
                    <QRCode value={passUrl} size={104} bgColor="#ffffff" fgColor="#0b0b0f" aria-label="QR-код пропуска" />
                    <div key={verdict === "scanning" ? scans.current : "rest"} className={styles.scanLine} data-on={verdict === "scanning" || undefined} aria-hidden="true" />
                  </div>
                </div>
              </div>
            </article>

            <article
              className={`${styles.passFace} ${styles.passBack}`}
              style={{
                background: verdict === "used" ? "linear-gradient(160deg, #5c0f1d, #1f0509)" : "linear-gradient(160deg, #0f5a35, #04170d)",
                color: "#fff",
              }}
              aria-hidden={!flipped}
            >
              <div className="flex flex-col items-center gap-3 px-8">
                <svg viewBox="0 0 96 96" className={styles.verdictIcon} style={{ color: verdict === "used" ? "#ff6b81" : "#46f08c" }} aria-hidden="true">
                  <circle cx="48" cy="48" r="44" opacity="0.35" />
                  {verdict === "used" ? <path d="M32 32 L64 64 M64 32 L32 64" /> : <path d="M28 50 L42 63 L68 35" />}
                </svg>
                <p className="text-[28px] leading-tight font-bold">{verdict === "used" ? "Уже использован" : "Проходите!"}</p>
                <p className="text-lg font-semibold">{guest.name}</p>
                <p className="text-sm text-white/70">
                  {verdict === "used" ? `Вход отмечен в ${checkedAt} — второй раз по этому пропуску не пройти` : `VIP · +1 гость · отмечен в ${checkedAt}`}
                </p>
                {verdict === "ok" && <p className="mt-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tabular-nums">Внутри: 28 из {ev.capacity}</p>}
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className={styles.passActions}>
        <button type="button" className={styles.primary} onClick={scan} disabled={verdict === "scanning"}>
          <ScanLine aria-hidden="true" />
          {verdict === "idle" ? "Проверить на входе · демо" : verdict === "scanning" ? "Проверяем…" : verdict === "ok" ? "Сканировать ещё раз" : "Сбросить демо"}
        </button>
        <button type="button" className={styles.secondary} onClick={onShareGoing}>
          <Sparkles aria-hidden="true" />
          Сторис «Я иду» — без QR
        </button>
        <p className="px-2 text-center text-xs leading-relaxed text-white/55">
          Скриншот не пройдёт: часы идут, рамка QR переливается, а на входе пропуск отмечается один раз.
        </p>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {verdict === "scanning" ? "Проверяем пропуск" : verdict === "ok" ? `Проходите, ${guest.name}` : verdict === "used" ? "Пропуск уже использован" : ""}
      </div>
    </div>
  );
}
