"use client";

import { Plane } from "lucide-react";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { textStyle } from "@/lib/textStyle";
import { findBlock } from "@/lib/blocks";
import { describeDate, monogram, splitNames } from "@/lib/calendar";
import { CalendarButton } from "../CalendarButton";
import { prefersReducedMotion, useMotion } from "../motion";
import { Section } from "../Section";
import type { BlockContext, BlockProps } from "./types";

/** Золотые искорки: положение, размер и сдвиг во времени — чтобы загорались по очереди. */
const SPARKLES: [x: number, y: number, size: number, delay: number][] = [
  [12, 14, 10, 0.2],
  [84, 11, 8, 1.7],
  [22, 34, 7, 3.1],
  [78, 30, 12, 0.9],
  [16, 58, 9, 2.4],
  [88, 52, 7, 4.2],
  [30, 76, 11, 1.2],
  [70, 72, 8, 3.6],
  [50, 22, 6, 2.8],
  [9, 86, 8, 4.8],
];

type HeroProps = BlockProps<"hero">;

export function HeroBlock(props: HeroProps) {
  switch (props.block.variant) {
    case "arch":
      return <HeroArch {...props} />;
    case "polaroid":
      return <HeroPolaroid {...props} />;
    case "minimal":
      return <HeroMinimal {...props} />;
    case "cover":
      return <HeroCover {...props} />;
    case "monogram":
      return <HeroMonogram {...props} />;
    case "ticket":
      return <HeroTicket {...props} />;
    default:
      return <HeroClassic {...props} />;
  }
}


/** Имена «от руки», одно за другим, между ними проявляется «&». */
function HeroNames({
  names,
  color,
  size = "calc(clamp(3rem, 15vw, 4.4rem) * var(--title-scale, 1))",
  shadow = false,
  style,
}: {
  names: string;
  color: string;
  size?: string;
  shadow?: boolean;
  /** Свой цвет/шрифт имён (textStyles.names) — поверх стиля темы. */
  style?: CSSProperties;
}) {
  const parts = splitNames(names);
  return (
    <h1
      data-testid="hero-names"
      className="break-words leading-[1.05]"
      style={{ fontFamily: "var(--font-title)", fontSize: size, color, textShadow: shadow ? "0 2px 20px rgba(40,30,20,.4)" : undefined, ...style }}
    >
      {parts.length === 2 ? (
        <>
          <span className="block">
            <span className="inline-block" data-reveal="1" data-anim="write" data-delay="0.9">
              {parts[0]}
            </span>
          </span>{" "}
          <span className="my-1 block font-[family-name:var(--font-body)] text-2xl text-[var(--accent)]">
            <span className="inline-block" data-reveal="2" data-anim="fade" data-delay="1.9">
              &amp;
            </span>
          </span>{" "}
          <span className="block">
            <span className="inline-block" data-reveal="2" data-anim="write" data-delay="2.1">
              {parts[1]}
            </span>
          </span>
        </>
      ) : (
        <span className="inline-block" data-reveal="1" data-anim="write" data-delay="0.9">
          {parts[0]}
        </span>
      )}
    </h1>
  );
}

/** Стрелка «листайте»: по линии бежит капля, нажатие прокручивает к следующему блоку. */
function ScrollHint() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Листать вниз"
      onClick={() => {
        // Блоки лежат в обёртках ширины — следующий ищем среди секций приглашения.
        const section = ref.current?.closest("section");
        const all = [...(section?.closest("main")?.querySelectorAll("section[data-block]") ?? [])];
        all[all.indexOf(section!) + 1]?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      }}
      className="inv-scroll absolute bottom-9 left-1/2 z-20 h-[52px] w-[30px] -translate-x-1/2"
    >
      <span className="inv-scroll-line" />
    </button>
  );
}

function Sparkles({ light }: { light: boolean }) {
  return (
    <div aria-hidden="true" className={`inv-sparkles pointer-events-none absolute inset-0 ${light ? "inv-sparkles-light" : ""}`}>
      {SPARKLES.map(([x, y, s, t], i) => (
        <i key={i} style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${s}px`, "--t": `${t}s` } as CSSProperties} />
      ))}
    </div>
  );
}

/** Дата с разрядкой, время, сердечко, подзаголовок и кнопка календаря — общий «хвост» главного экрана. */
function HeroDetails({ block, ctx, light = false }: HeroProps & { light?: boolean }) {
  const { dotted, time } = describeDate(block.date);
  return (
    <>
      <p className="mt-8 font-[family-name:var(--font-heading)] text-lg tracking-[0.3em]" data-reveal="3" data-anim="spread" data-delay="3">
        {dotted}
      </p>
      <p className="inv-caps mt-2 opacity-70" data-reveal="3" data-anim="fade" data-delay="3.3">
        {time}
      </p>
      <div className="mt-6" data-reveal="4" data-anim="pop" data-delay="3.6" aria-hidden="true">
        <span className="inv-pulse inline-block text-base text-[var(--accent)]" style={light ? { color: "#fff" } : undefined}>
          ♡
        </span>
      </div>
      {block.subtitle && (
        <p className="mx-auto mt-4 max-w-xs text-xl italic leading-snug opacity-90" data-reveal="4" data-anim="blur" data-delay="3.9" style={textStyle(block, "subtitle")}>
          {block.subtitle}
        </p>
      )}
      <div data-reveal="5" data-delay="4.3">
        <CalendarButton ctx={ctx} light={light} />
      </div>
    </>
  );
}

/** Фото-заглушка, если фото не загружено: мягкий градиент акцента с монограммой. */
function PhotoPlaceholder({ names }: { names: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center text-5xl text-white/90"
      style={{
        fontFamily: "var(--font-title)",
        background:
          "radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--accent) 35%, white), color-mix(in srgb, var(--accent) 75%, var(--bg)))",
      }}
    >
      {monogram(names)}
    </div>
  );
}

function HeroClassic({ block, ctx }: HeroProps) {
  const onPhoto = !!block.photo;
  const motion = useMotion();
  const photoRef = useRef<HTMLDivElement>(null);

  // Параллакс: при прокрутке фото движется чуть медленнее страницы (только у гостя, не в превью).
  useEffect(() => {
    const photo = photoRef.current;
    if (!photo || ctx.preview || motion !== "on" || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) photo.style.transform = `translateY(${(y * 0.12).toFixed(2)}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ctx.preview, motion, onPhoto]);

  return (
    <Section
      block={block}
      bare
      frame
      className={`inv-hero flex min-h-[min(100svh,780px)] flex-col items-center justify-center px-8 pt-20 pb-32 ${onPhoto ? "text-white" : "text-[var(--text)]"}`}
      fill={
        onPhoto && (
          <>
            <div ref={photoRef} aria-hidden="true" className="absolute inset-x-0 -inset-y-[4%]">
              <div
                data-testid="hero-photo"
                className="inv-hero-photo absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${block.photo}")` }}
              />
            </div>
            <div aria-hidden="true" className="inv-hero-overlay absolute inset-0" />
          </>
        )
      }
      background={
        <>
          <Sparkles light={onPhoto} />
          <ScrollHint />
        </>
      }
    >
      {block.label && (
        <p className="inv-caps mb-8 opacity-80" data-reveal="1" data-delay="0.4" style={textStyle(block, "label")}>
          {block.label}
        </p>
      )}
      <HeroNames style={textStyle(block, "names")} names={block.names} color={onPhoto ? "#fff" : "var(--text)"} shadow={onPhoto} />
      <HeroDetails block={block} ctx={ctx} light={onPhoto} />
    </Section>
  );
}

/** Фото в арке с тонкой золотой обводкой; арка раскрывается шторкой. */
function HeroArch({ block, ctx }: HeroProps) {
  return (
    <Section
      block={block}
      bare
      className="inv-hero flex min-h-[min(100svh,780px)] flex-col items-center justify-center px-8 pt-14 pb-28"
      background={
        <>
          <Sparkles light={false} />
          <ScrollHint />
        </>
      }
    >
      {block.label && (
        <p className="inv-caps mb-6 opacity-80" data-reveal="1" data-delay="0.2" style={textStyle(block, "label")}>
          {block.label}
        </p>
      )}
      <div className="inv-arch relative mx-auto w-[74%] max-w-[300px]" data-reveal="1" data-anim="curtain" data-delay="0.3">
        <div className="aspect-[3/4] overflow-hidden rounded-t-full">
          {block.photo ? (
            <img src={block.photo} alt="" data-testid="hero-photo" className="h-full w-full object-cover" />
          ) : (
            <PhotoPlaceholder names={block.names} />
          )}
        </div>
      </div>
      <div className="mt-8">
        <HeroNames style={textStyle(block, "names")} names={block.names} color="var(--text)" size="calc(clamp(2.6rem, 12vw, 3.6rem) * var(--title-scale, 1))" />
      </div>
      <HeroDetails block={block} ctx={ctx} />
    </Section>
  );
}

/** Фото-полароид на скотче, подпись именами на карточке. */
function HeroPolaroid({ block, ctx }: HeroProps) {
  return (
    <Section block={block} bare className="inv-hero flex min-h-[min(100svh,780px)] flex-col items-center justify-center px-8 pt-16 pb-28" background={<ScrollHint />}>
      {block.label && (
        <p className="inv-caps mb-8 opacity-80" data-reveal="1" data-delay="0.2" style={textStyle(block, "label")}>
          {block.label}
        </p>
      )}
      <div className="inv-polaroid relative mx-auto w-[72%] max-w-[290px]" data-reveal="1" data-anim="drop" data-delay="0.4">
        <span aria-hidden="true" className="inv-tape left-[12%] -rotate-12" />
        <span aria-hidden="true" className="inv-tape right-[12%] rotate-12" />
        <div className="aspect-square overflow-hidden bg-neutral-200">
          {block.photo ? (
            <img src={block.photo} alt="" data-testid="hero-photo" className="h-full w-full object-cover" />
          ) : (
            <PhotoPlaceholder names={block.names} />
          )}
        </div>
        <div className="px-2 pt-3 pb-1 text-[#3e3630]">
          <HeroNames style={textStyle(block, "names")} names={block.names} color="#3e3630" size="calc(1.9rem * var(--title-scale, 1))" />
        </div>
      </div>
      <HeroDetails block={block} ctx={ctx} />
    </Section>
  );
}

/** Крупная типографика: дата цифрами, тонкая линия, имена капителью. */
function HeroMinimal({ block, ctx }: HeroProps) {
  const { dotted, time } = describeDate(block.date);
  const [day, month, year] = dotted.split(" . ");
  const parts = splitNames(block.names);
  return (
    <Section block={block} bare frame className="inv-hero flex min-h-[min(100svh,780px)] flex-col items-center justify-center px-8 pt-16 pb-28" background={<ScrollHint />}>
      {block.photo && (
        <div className="mx-auto mb-8 h-28 w-28 overflow-hidden rounded-full ring-1 ring-[var(--accent)] ring-offset-4 ring-offset-[var(--bg)]" data-reveal="1" data-anim="pop" data-delay="0.2">
          <img src={block.photo} alt="" data-testid="hero-photo" className="h-full w-full object-cover" />
        </div>
      )}
      {block.label && (
        <p className="inv-caps mb-6 opacity-70" data-reveal="1" data-delay="0.4" style={textStyle(block, "label")}>
          {block.label}
        </p>
      )}
      <div className="flex items-center justify-center gap-4 font-[family-name:var(--font-heading)] leading-none font-light" data-reveal="2" data-anim="spread" data-delay="0.8">
        <span className="text-6xl">{day}</span>
        <span aria-hidden="true" className="h-14 w-px bg-[var(--accent)]" />
        <span className="text-6xl">{month}</span>
      </div>
      <p className="inv-caps mt-3 text-[var(--accent)]" data-reveal="2" data-delay="1.2">
        {year} · {time}
      </p>
      <div className="mx-auto my-8 h-16 w-px bg-[var(--accent)]/60" data-reveal="3" data-anim="fade" data-delay="1.6" aria-hidden="true" />
      <h1 data-testid="hero-names" style={textStyle(block, "names")} className="inv-heading text-[1.6rem] leading-snug" data-reveal="3" data-anim="blur" data-delay="1.9">
        {parts.length === 2 ? (
          <>
            <span className="block">{parts[0]}</span> <span className="inv-script my-1 block text-3xl normal-case tracking-normal">&amp;</span>{" "}
            <span className="block">{parts[1]}</span>
          </>
        ) : (
          parts[0]
        )}
      </h1>
      {block.subtitle && (
        <p className="mx-auto mt-6 max-w-xs text-xl italic leading-snug opacity-85" data-reveal="4" data-anim="blur" data-delay="2.6" style={textStyle(block, "subtitle")}>
          {block.subtitle}
        </p>
      )}
      <div data-reveal="5" data-delay="3">
        <CalendarButton ctx={ctx} />
      </div>
    </Section>
  );
}

/** Имена в две строки с рукописным «&» между ними (амперсанд всегда рукописный — так он читается как украшение). */
function StackedNames({ block, className, amp }: { block: HeroProps["block"]; className: string; amp: string }) {
  const parts = splitNames(block.names);
  return (
    <h1 data-testid="hero-names" className={className} style={{ fontFamily: "var(--font-title)", ...textStyle(block, "names") }}>
      {parts.length === 2 ? (
        <>
          <span className="block" data-reveal="2" data-anim="blur" data-delay="0.5">
            {parts[0]}
          </span>{" "}
          <span className={`inv-amp block ${amp}`} data-reveal="2" data-anim="fade" data-delay="0.9">
            &amp;
          </span>{" "}
          <span className="block" data-reveal="3" data-anim="blur" data-delay="1.1">
            {parts[1]}
          </span>
        </>
      ) : (
        <span data-reveal="2" data-anim="blur">
          {parts[0]}
        </span>
      )}
    </h1>
  );
}

/** Фото сверху с мягкой волной снизу; под ним имена, дата и подзаголовок — как у печатного приглашения. */
function HeroCover({ block, ctx }: HeroProps) {
  const { dotted, time } = describeDate(block.date);
  return (
    <Section block={block} bare className="inv-hero flex min-h-[min(100svh,780px)] flex-col pb-14">
      <div className="inv-cover-photo relative h-[54svh] max-h-[470px] min-h-[330px] w-full overflow-hidden" data-reveal="1" data-anim="fade">
        {block.photo ? (
          <img src={block.photo} alt="" data-testid="hero-photo" className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder names={block.names} />
        )}
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 pt-4 text-center">
        {block.label && (
          <p className="inv-caps mb-5 opacity-75" data-reveal="1" data-delay="0.3" style={textStyle(block, "label")}>
            {block.label}
          </p>
        )}
        <StackedNames block={block} className="inv-cover-names" amp="-my-3" />
        <p className="mt-6 font-[family-name:var(--font-heading)] text-lg tracking-[0.3em]" data-reveal="3" data-anim="spread" data-delay="1.5">
          {dotted}
        </p>
        <p className="inv-caps mt-2 opacity-70" data-reveal="3" data-delay="1.7">
          {time}
        </p>
        {block.subtitle && (
          <p className="mx-auto mt-5 max-w-xs text-xl leading-snug italic opacity-90" data-reveal="4" data-anim="blur" data-delay="1.9" style={textStyle(block, "subtitle")}>
            {block.subtitle}
          </p>
        )}
        <div data-reveal="5" data-delay="2.2">
          <CalendarButton ctx={ctx} />
        </div>
      </div>
    </Section>
  );
}

/** Веточка по кольцу монограммы снизу справа: стебель по дуге и контурные листья попеременно. */
const SPRIG = Array.from({ length: 6 }, (_, k) => {
  const a = ((18 + k * 11) * Math.PI) / 180;
  const side = k % 2 ? 1 : -1;
  const r = 64 + side * 5.5;
  return { x: 72 + r * Math.cos(a), y: 72 + r * Math.sin(a), deg: 18 + k * 11 + 90 + side * 38 };
});

/** Монограмма в тонком кольце с веточкой, имена от руки, дата и место; внизу — фото, проявляющееся из фона. */
function HeroMonogram({ block, ctx }: HeroProps) {
  const [first, second] = monogram(block.names).split("&");
  const { day, monthGenitive, year, time } = describeDate(block.date);
  return (
    <Section block={block} bare className="inv-hero flex min-h-[min(100svh,780px)] flex-col px-8 pt-16 text-center">
      <div className="inv-monogram relative mx-auto flex size-36 items-center justify-center text-[var(--accent)]" data-reveal="1" data-anim="pop" data-delay="0.2">
        <svg aria-hidden="true" viewBox="0 0 144 144" className="absolute inset-0 size-full overflow-visible" fill="none" stroke="currentColor">
          <circle cx="72" cy="72" r="64" strokeWidth=".9" />
          <circle cx="72" cy="72" r="59" strokeWidth=".5" opacity=".6" />
          <path d="M131 94 A64 64 0 0 1 100 129" strokeWidth="1.1" />
          {SPRIG.map(({ x, y, deg }, i) => (
            <ellipse key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="5.2" ry="2.1" strokeWidth=".9" transform={`rotate(${deg.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`} />
          ))}
        </svg>
        <span className="relative flex items-center gap-2 font-[family-name:var(--font-body)] text-[2.6rem] leading-none text-[var(--text)]">
          <span>{first}</span>
          {second && <span aria-hidden="true" className="h-12 w-px rotate-[18deg] bg-[var(--accent)]" />}
          {second && <span>{second}</span>}
        </span>
      </div>
      {block.label && (
        <p className="inv-caps mt-8 opacity-75" data-reveal="1" data-delay="0.5" style={textStyle(block, "label")}>
          {block.label}
        </p>
      )}
      <div className="mt-6">
        <HeroNames style={textStyle(block, "names")} names={block.names} color="var(--text)" size="calc(clamp(2.8rem, 13vw, 3.8rem) * var(--title-scale, 1))" />
      </div>
      <p className="inv-caps mt-7 text-[0.78rem]" data-reveal="3" data-anim="spread" data-delay="2.6">
        {day} {monthGenitive} {year} · {time}
      </p>
      {block.subtitle && (
        <p className="inv-caps mt-2 opacity-70" data-reveal="3" data-delay="2.9" style={textStyle(block, "subtitle")}>
          {block.subtitle}
        </p>
      )}
      <div data-reveal="4" data-delay="3.2">
        <CalendarButton ctx={ctx} />
      </div>
      {block.photo ? (
        // Фото — во всю ширину блока (выходит за поля) и проявляется из фона сверху.
        <div className="inv-monogram-photo relative -mx-8 mt-10 h-[300px]" data-reveal="4" data-anim="fade" data-delay="0.6">
          <img src={block.photo} alt="" data-testid="hero-photo" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : (
        <div className="pb-24" />
      )}
    </Section>
  );
}

/** Глобус из меридианов и параллелей с пунктиром маршрута — рисунок для билета. */
function TicketGlobe() {
  return (
    <svg aria-hidden="true" viewBox="0 0 140 104" className="mx-auto h-24 w-auto" fill="none" stroke="currentColor" strokeWidth=".8">
      <circle cx="70" cy="52" r="40" />
      <ellipse cx="70" cy="52" rx="14" ry="40" />
      <ellipse cx="70" cy="52" rx="28" ry="40" />
      <path d="M70 12 V92" />
      <path d="M30 52 H110" />
      <path d="M35 32 Q70 40 105 32 M35 72 Q70 64 105 72" />
      <path d="M8 84 C30 108 100 102 128 34" strokeDasharray="3 3" opacity=".7" />
      <path d="M128 34 l-7 3 3 2 -1 4 2 1 3 -4 3 1 1 -2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Штемпель: двойное кольцо с именами и датой по кругу, в центре сердце; рядом — волнистые линии гашения. */
function Postmark({ names, date }: { names: string; date: string }) {
  const id = useId().replace(/:/g, "");
  const text = `${names.toUpperCase()} · ${date} · `;
  return (
    <svg aria-hidden="true" viewBox="0 0 150 76" className="h-[76px] w-auto opacity-80" fill="none" stroke="currentColor">
      <circle cx="38" cy="38" r="34" strokeWidth="1.2" />
      <circle cx="38" cy="38" r="22" strokeWidth=".8" />
      <path id={`pm${id}`} d="M38 10 a28 28 0 1 1 -0.1 0" stroke="none" />
      <text fontSize="6.4" letterSpacing="1.2" fill="currentColor" stroke="none" fontFamily="var(--font-heading)">
        <textPath href={`#pm${id}`}>{text.length > 40 ? text.slice(0, 40) : text}</textPath>
      </text>
      <path d="M38 45 C30 39 28 34 32 31 C35 29 38 31 38 34 C38 31 41 29 44 31 C48 34 46 39 38 45Z" fill="currentColor" stroke="none" />
      {[20, 30, 40, 50].map((y) => (
        <path key={y} d={`M78 ${y} q6 -5 12 0 t12 0 t12 0 t12 0 t12 0`} strokeWidth="1" />
      ))}
    </svg>
  );
}

/** Посадочный талон: кремовый билет с перфорацией, глобусом, именами, датой, местом и штемпелем. */
function HeroTicket({ block, ctx }: HeroProps) {
  const parts = splitNames(block.names);
  const { dotted, time } = describeDate(block.date);
  const place = findBlock(ctx.data, "location")?.placeName;
  return (
    <Section block={block} bare className="inv-hero flex min-h-[min(100svh,780px)] flex-col items-center justify-center px-5 py-14">
      <div className="inv-ticket-wrap w-full max-w-[370px]" data-reveal="1" data-anim="drop" data-delay="0.2">
        <div className="inv-ticket relative px-7 pt-6 pb-4 text-center">
          <span aria-hidden="true" className="inv-caps absolute top-1/2 left-2.5 -translate-y-1/2 rotate-180 text-[0.55rem] opacity-70 [writing-mode:vertical-rl]">
            ▲ Вылет
          </span>
          <p className="inv-caps pb-3 text-[0.62rem]" style={textStyle(block, "label")}>
            {block.label || "Свадебный билет"}
          </p>
          <div className="inv-ticket-rule" />
          <Plane aria-hidden="true" strokeWidth={1.3} className="mx-auto mt-3 size-5" />
          <div className="mt-2 opacity-80">
            <TicketGlobe />
          </div>
          <h1 data-testid="hero-names" className="inv-ticket-names mt-3" style={{ fontFamily: "var(--font-title)", ...textStyle(block, "names") }}>
            {parts.length === 2 ? (
              <>
                <span className="block">{parts[0]}</span> <span className="inv-amp block text-[1.9rem] leading-[0.9] normal-case">и</span>{" "}
                <span className="block">{parts[1]}</span>
              </>
            ) : (
              parts[0]
            )}
          </h1>
          <dl className="inv-ticket-grid mt-5 grid grid-cols-2 text-left">
            <div>
              <dt>Дата</dt>
              <dd>{dotted.replace(/ /g, "")}</dd>
            </div>
            <div>
              <dt>Время</dt>
              <dd>{time}</dd>
            </div>
            {place && (
              <div className="col-span-2">
                <dt>Место</dt>
                <dd>{place}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex justify-center">
            <Postmark names={parts.join(" & ")} date={dotted.replace(/ /g, "")} />
          </div>
          <div className="inv-ticket-rule mt-3" />
          <p className="inv-caps pt-3 text-[0.62rem]" style={textStyle(block, "subtitle")}>
            {block.subtitle || "Посадка на любовь"}
          </p>
        </div>
      </div>
      <div data-reveal="3" data-delay="0.9">
        <CalendarButton ctx={ctx} />
      </div>
    </Section>
  );
}
