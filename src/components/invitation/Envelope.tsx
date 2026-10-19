"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { monogram, splitNames } from "@/lib/calendar";
import type { EnvelopeStyle } from "@/lib/schema";
import { useGuestLanguage } from "./language";
import { prefersReducedMotion } from "./motion";

/** Ролик «Видео-конверта» по умолчанию (шаблон «Этно», toigokel.kg) — если в теме нет своего. */
export const DEFAULT_ENVELOPE_VIDEO = { video: "/templates/etno-envelope.mp4", poster: "/templates/etno-envelope.webp" };
/** Ролик не доиграл (завис, вкладку свернули) — открываем приглашение не позже этого. */
const VIDEO_GUARD_MS = 15000;

/** Сколько уходит заставка после нажатия — по виду (совпадает с переходами .inv-intro-* в globals.css). */
export const INTRO_LEAVE_MS: Record<EnvelopeStyle, number> = { seal: 1300, veil: 1300, flap: 2300, curtains: 1700, book: 1700, video: 600 };

type Props = {
  names: string;
  label?: string;
  date?: string;
  ornament: string | null;
  hasMusic: boolean;
  /** Вид заставки: печать, вуаль, конверт с клапаном, шторки, книга. */
  variant?: EnvelopeStyle;
  /** Гость нажал на печать: заставка уходит (родитель уберёт её по окончании, см. INTRO_LEAVE_MS). */
  leaving: boolean;
  onOpen: () => void;
  /** Внутри рамки телефона в редакторе, а не поверх всего окна. */
  contained?: boolean;
  /** Вид video: ролик открытия и его первый кадр (нет — DEFAULT_ENVELOPE_VIDEO). */
  video?: string | null;
  poster?: string | null;
  /**
   * Вид video: гость нажал, ролик начинает играть — жест пользователя, тут родитель включает музыку.
   * onOpen у этого вида — когда ролик доиграл.
   */
  onStart?: () => void;
};

/**
 * Заставка перед приглашением: рамка прочерчивается из двух углов, ветки проявляются и покачиваются, имена
 * пишутся от руки, печать с монограммой «дышит» кольцами. Клик по печати — жест пользователя, в нём родитель
 * запускает музыку. Вид задаёт фон и уход (классы inv-intro* и inv-intro-{вид} в globals.css).
 */
export function Envelope(props: Props) {
  if (props.variant === "video") return <VideoEnvelope {...props} />;
  return <DrawnEnvelope {...props} />;
}

/**
 * Видео-конверт (как на toigokel.kg): на весь экран первый кадр ролика с подсказкой; нажатие запускает музыку и
 * ролик открытия, по его окончании приглашение открывается (заставка растворяется — .inv-intro-video).
 */
function VideoEnvelope({ video, poster, leaving, onOpen, onStart, contained = false }: Props) {
  const { t } = useGuestLanguage();
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const done = useRef(false);
  const guard = useRef<ReturnType<typeof setTimeout>>(undefined);
  const src = video || (poster ? null : DEFAULT_ENVELOPE_VIDEO.video);
  const still = poster || (video ? undefined : DEFAULT_ENVELOPE_VIDEO.poster);

  useEffect(() => () => clearTimeout(guard.current), []);

  function finish() {
    if (done.current) return;
    done.current = true;
    clearTimeout(guard.current);
    onOpen();
  }

  function start() {
    if (started) return;
    setStarted(true);
    onStart?.();
    const el = ref.current;
    if (!el || !src || prefersReducedMotion()) return finish();
    try {
      el.currentTime = 0;
    } catch {
      // на некоторых телефонах перемотка — только после метаданных
    }
    el.play().catch(finish);
    guard.current = setTimeout(finish, VIDEO_GUARD_MS);
  }

  return (
    <div
      data-testid="envelope"
      role="dialog"
      aria-label={t.invitation}
      data-style="video"
      data-leaving={leaving || undefined}
      className={`inv-intro-video ${contained ? "absolute" : "fixed"} inset-0 z-30 flex justify-center overflow-hidden bg-[#171715]`}
    >
      <button
        type="button"
        aria-label={t.openInvitation}
        disabled={started}
        onClick={start}
        className="relative h-full w-full max-w-[35rem] cursor-pointer overflow-hidden"
      >
        <video
          ref={ref}
          src={src ?? undefined}
          poster={still}
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={() => started && finish()}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!started && (
          <span className="inv-intro-video-hint absolute inset-x-4 top-[68%] grid -translate-y-1/2 gap-1.5 text-center" style={{ fontFamily: "var(--font-body)" }}>
            <span className="text-[clamp(1rem,4.5vw,1.35rem)] font-semibold leading-tight text-[var(--accent)] [text-shadow:0_1px_0_rgb(255_250_242/.75)]">
              {t.tapToOpen}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

function DrawnEnvelope({ names, label, date, ornament, hasMusic, variant = "seal", leaving, onOpen, contained = false }: Props) {
  const { t } = useGuestLanguage();
  const parts = splitNames(names);
  const initials = monogram(names).split("&");

  const seal = (
    <button type="button" aria-label={t.openInvitation} disabled={leaving} className="inv-intro-open relative z-10 flex flex-col items-center gap-5" onClick={onOpen}>
      <span
        className="inv-intro-seal relative flex h-24 w-24 items-center justify-center rounded-full text-3xl text-white"
        style={{
          fontFamily: "var(--font-title)",
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 55%, white), var(--accent) 60%, color-mix(in srgb, var(--accent) 75%, black))",
        }}
      >
        <span aria-hidden="true" className="inv-intro-ring" />
        <span aria-hidden="true" className="inv-intro-ring inv-intro-ring-late" />
        <span className="relative [text-shadow:0_1px_2px_rgba(60,40,20,.35)]">
          {initials[0]}
          {initials[1] && (
            <>
              <i className="mx-0.5 font-[family-name:var(--font-body)] text-base not-italic opacity-85">&amp;</i>
              {initials[1]}
            </>
          )}
        </span>
      </span>
      <span className="inv-caps">{t.openInvitation}</span>
      {hasMusic && <span className="-mt-3 text-sm italic opacity-60">{t.musicWillPlay}</span>}
    </button>
  );

  const text: ReactNode = (
    <>
      {label && <p className="inv-caps inv-intro-kicker mb-8 opacity-75">{label}</p>}
      <p className="leading-[1.05]" style={{ fontFamily: "var(--font-title)", fontSize: "calc(clamp(3rem, 14vw, 4.2rem) * var(--title-scale, 1))" }}>
        {parts.length === 2 ? (
          <>
            <span className="block">
              <span className="inv-intro-name inline-block">{parts[0]}</span>
            </span>{" "}
            <span className="inv-intro-amp my-1 block font-[family-name:var(--font-body)] text-2xl text-[var(--accent)]">&amp;</span>{" "}
            <span className="block">
              <span className="inv-intro-name inv-intro-name-late inline-block">{parts[1]}</span>
            </span>
          </>
        ) : (
          <span className="inv-intro-name inline-block">{parts[0]}</span>
        )}
      </p>
      {date && <p className="inv-intro-date mt-8 font-[family-name:var(--font-heading)] tracking-[0.3em] opacity-75">{date}</p>}
    </>
  );

  return (
    <div
      data-testid="envelope"
      role="dialog"
      aria-label={label || t.invitation}
      data-style={variant}
      data-leaving={leaving || undefined}
      className={`inv-intro inv-intro-${variant} ${contained ? "absolute" : "fixed"} inset-0 z-30 flex items-center justify-center overflow-hidden text-[var(--text)]`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Фон заставки: у шторок и книги он «уезжает» отдельно, открывая приглашение. */}
      {variant === "curtains" ? (
        <>
          <div aria-hidden="true" className="inv-curtain inv-curtain-left" />
          <div aria-hidden="true" className="inv-curtain inv-curtain-right" />
        </>
      ) : variant === "book" ? (
        <div aria-hidden="true" className="inv-book-cover" />
      ) : (
        <div aria-hidden="true" className="inv-intro-bg absolute inset-0" />
      )}
      <div aria-hidden="true" className="inv-intro-frame pointer-events-none absolute inset-[18px]" />
      {ornament && (
        <>
          <img
            src={ornament}
            alt=""
            aria-hidden="true"
            className="inv-intro-decor pointer-events-none absolute -right-8 -top-6 w-44 max-w-[50%]"
          />
          <img
            src={ornament}
            alt=""
            aria-hidden="true"
            className="inv-intro-decor inv-intro-decor-late pointer-events-none absolute -bottom-6 -left-8 w-40 max-w-[45%]"
            style={{ transform: "rotate(180deg)" }}
          />
        </>
      )}

      <div className="inv-intro-content relative flex max-w-sm flex-col items-center px-8 text-center">
        {text}
        {variant === "flap" ? (
          // Конверт: печать на клапане, при открытии клапан откидывается и из конверта выезжает письмо.
          <div className="inv-env relative mt-10 mb-16 h-[150px] w-[230px]">
            <div aria-hidden="true" className="inv-env-back absolute inset-0 rounded-md" />
            {/* На письме — «Приглашение» и «от …» от руки (Great Vibes всегда рукописный, шрифт имён может быть печатным),
                в верхних углах — украшение конверта из шаблона, без него — сердечки. Низ письма остаётся в конверте. */}
            <div aria-hidden="true" className="inv-env-letter absolute inset-x-3 top-3 bottom-2 flex flex-col items-center overflow-hidden rounded-sm pt-3">
              {ornament ? (
                <>
                  <img src={ornament} alt="" className="absolute -top-4 -right-6 w-12 rotate-12 opacity-85" />
                  <img src={ornament} alt="" className="absolute -top-4 -left-6 w-12 -scale-x-100 -rotate-12 opacity-85" />
                </>
              ) : (
                <>
                  <span className="absolute top-1.5 left-2.5 text-[10px] opacity-50">♡</span>
                  <span className="absolute top-5 left-5 text-[7px] opacity-35">♡</span>
                  <span className="absolute top-1.5 right-2.5 text-[10px] opacity-50">♡</span>
                  <span className="absolute top-5 right-5 text-[7px] opacity-35">♡</span>
                </>
              )}
              <span className="relative z-10 text-[26px] leading-none" style={{ fontFamily: "var(--font-great-vibes), cursive" }}>
                {t.invitation}
              </span>
              <span className="relative z-10 mt-1 flex items-center gap-1.5 text-[9px] opacity-60">
                <span className="h-px w-6 bg-current" />♡<span className="h-px w-6 bg-current" />
              </span>
              {names.trim() && (
                <span
                  className="relative z-10 mt-0.5 line-clamp-2 px-6 text-center text-[17px] leading-tight text-[var(--text)] opacity-85"
                  style={{ fontFamily: "var(--font-great-vibes), cursive" }}
                >
                  {t.fromNames(names.trim())}
                </span>
              )}
            </div>
            <div aria-hidden="true" className="inv-env-front absolute inset-0 rounded-md" />
            <div aria-hidden="true" className="inv-env-flap absolute inset-x-0 top-0 h-[90px]" />
            <div className="inv-env-seal absolute top-[52px] left-1/2 -translate-x-1/2 whitespace-nowrap [&_.inv-intro-seal]:h-16 [&_.inv-intro-seal]:w-16 [&_.inv-intro-seal]:text-xl [&_.inv-caps]:mt-10">
              {seal}
            </div>
          </div>
        ) : (
          <div className="mt-12">{seal}</div>
        )}
      </div>
    </div>
  );
}
