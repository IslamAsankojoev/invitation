"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { blockTitle } from "@/lib/blocks";
import { blockEdges, edgeHeight, edgeMaskStyle, edgePad, edgesVisible, tornPaperStyle } from "@/lib/edges";
import { isDarkColor } from "@/lib/color";
import { darkSurfaces, isFullWidth, isPanelSurface, lightSurfaces, surfaceImages, surfaceLayer, surfaceObjects, takesBgColor, tintedPanel } from "@/lib/library";
import { ornamentImageStyle, ornamentMotionProps, ornamentStyle } from "@/lib/ornaments";
import { textStyle } from "@/lib/textStyle";
import type { Block } from "@/lib/schema";
import { useOrnamentMotion, useReveal } from "./motion";

type Props = {
  block: Pick<
    Block,
    | "id"
    | "type"
    | "title"
    | "scriptLine"
    | "surface"
    | "surfaceOpacity"
    | "ornaments"
    | "entrance"
    | "edgeTop"
    | "edgeBottom"
    | "edgeTopSeed"
    | "edgeBottomSeed"
    | "width"
    | "bgImage"
    | "bgDim"
    | "bgBlur"
    | "bgDarken"
    | "bgColor"
    | "textStyles"
  >;
  children: ReactNode;
  /** Без стандартных отступов и заголовка (главный экран рисует их сам). */
  bare?: boolean;
  /** Тонкая рамка по краю блока, как у печатной открытки; прочерчивается из двух углов. */
  frame?: boolean;
  /** Своя заливка во весь блок (фото обложки): вместе со слоем фона режется по краям блока. */
  fill?: ReactNode;
  /** Слои под рамкой и содержимым, которые края не режут (искорки, стрелка «Листать вниз»). */
  background?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** С какого затемнения фоновой картинки текст блока без панели становится светлым. */
export const DARK_TEXT_FROM = 0.45;

/**
 * Обёртка любого блока: фон (бумага/карточка/фактура), украшения, заголовок и появление при прокрутке
 * (см. motion.tsx и раздел «Анимации приглашения» в globals.css).
 */
export function Section({ block, children, bare = false, frame = false, fill, background, className = "", style }: Props) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref, block.entrance === "none");
  const ornamentMotion = useOrnamentMotion();
  const title = bare ? "" : blockTitle(block);
  const script = bare ? "" : block.scriptLine?.trim();
  const surfaceImage = surfaceImages[block.surface];
  const layer = surfaceLayer(block.surface);
  const object = surfaceObjects[block.surface];
  const crest = object?.kind === "border" ? object.crest : undefined;
  const hasSurface = block.surface !== "plain";
  // Сквозь полупрозрачный фон проступает фон темы — тогда оставляем цвет текста темы.
  const dense = block.surfaceOpacity >= 0.5;
  const lightText = lightSurfaces.includes(block.surface) && dense;
  // На сильно затемнённой картинке без панели текст светлый, иначе он тонет в темноте.
  const darkText =
    (darkSurfaces.includes(block.surface) && dense) || (!!block.bgImage && block.bgDarken >= DARK_TEXT_FROM && block.surface === "plain");
  // Свой цвет фона: заливка блока или цвет панели. Текст и акцент подстраиваются под его яркость (inv-fill-*).
  const fillColor = block.bgColor && takesBgColor(block.surface) ? block.bgColor : null;
  const fillTone = fillColor && !darkText && (hasSurface ? dense : true) ? (isDarkColor(fillColor) ? "dark" : "light") : null;
  // Предметы с pad — общий класс (поля и размер), отступы до «поля» предмета — inline; остальные — .surface-<id>.
  const surfaceClass = !hasSurface
    ? bare
      ? ""
      : "px-6 py-16"
    : isPanelSurface(block.surface)
      ? "surface-card"
      : object?.pad
        ? object.kind === "contain"
          ? "surface-round"
          : "surface-object"
        : `surface-${block.surface}`;
  // Края режут фон блока (панель или фото во весь блок); без такого фона край не на чем показать.
  // Фоновая картинка блока — заливка во весь блок, как фото обложки: приглушается цветом фона палитры.
  const bgImage = (block.bgImage || (fillColor && !hasSurface)) && (
    <>
      {fillColor && !hasSurface && <div aria-hidden="true" data-testid="block-fill" className="absolute inset-0" style={{ background: fillColor }} />}
      {block.bgImage && (
        <>
      <div
        aria-hidden="true"
        data-testid="block-bg"
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${block.bgImage}")`,
          // Размытая картинка к краям светлеет (размывается с пустотой) — выносим её за края блока, лишнее обрежется.
          ...(block.bgBlur > 0 ? { filter: `blur(${block.bgBlur}px)`, inset: -block.bgBlur * 2 } : {}),
        }}
      />
      {block.bgDim > 0 && <div aria-hidden="true" className="absolute inset-0 bg-[var(--bg)]" style={{ opacity: block.bgDim }} />}
      {block.bgDarken > 0 && <div aria-hidden="true" className="absolute inset-0 bg-black" style={{ opacity: block.bgDarken }} />}
        </>
      )}
    </>
  );
  const full = isFullWidth(block);
  const edgeable = edgesVisible(block.surface, !!fill || !!block.bgImage || !!fillColor);
  const edges = blockEdges(block);
  const top = edgeable ? edges.top : "none";
  const bottom = edgeable ? edges.bottom : "none";
  const edged = top !== "none" || bottom !== "none";

  const surfaceNode = hasSurface && (
    <div
      aria-hidden="true"
      data-testid="surface-layer"
      // Бумага «падает» на место сверху с лёгким поворотом, карточка просто проявляется.
      data-reveal="1"
      data-anim={surfaceImage ? "drop" : "fade"}
      className={`surface-layer ${layer.className}`}
      style={{ ...layer.style, ...(fillColor ? tintedPanel(block.surface, fillColor) : {}), opacity: block.surfaceOpacity }}
    />
  );

  return (
    <section
      ref={ref}
      data-block={block.type}
      data-block-id={block.id}
      data-surface={block.surface}
      data-entrance={block.entrance}
      data-width={full ? "full" : undefined}
      className={`relative overflow-hidden text-center ${surfaceClass} ${top !== "none" ? "rounded-t-none" : ""} ${bottom !== "none" ? "rounded-b-none" : ""} ${lightText && !fillTone ? "surface-light-text" : ""} ${darkText ? "surface-dark-text" : ""} ${fillTone ? `inv-fill-${fillTone}` : ""} ${className}`}
      style={{ ...style, ...(object?.pad ? { padding: object.pad } : {}), ...(fillTone ? { ["--fill" as string]: fillColor } : {}) }}
    >
      {edged ? (
        <div
          aria-hidden="true"
          data-testid="edges"
          data-edge-top={top === "none" ? undefined : top}
          data-edge-bottom={bottom === "none" ? undefined : bottom}
          className="inv-edges pointer-events-none absolute inset-0"
        >
          {/* Под окрашенным слоем — белая сердцевина бумаги: видна на разрыве узкой волокнистой кромкой. */}
          {top === "torn" && <div style={tornPaperStyle("top", edges.topSeed)} />}
          {bottom === "torn" && <div style={tornPaperStyle("bottom", edges.bottomSeed)} />}
          <div className="absolute inset-0" style={edgeMaskStyle({ ...edges, top, bottom })}>
            {bgImage}
            {fill}
            {surfaceNode}
          </div>
        </div>
      ) : (
        <>
          {bgImage}
          {fill}
          {surfaceNode}
        </>
      )}
      {background}
      {crest && (
        <img
          src={crest.src}
          alt=""
          aria-hidden="true"
          data-testid="surface-crest"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
          style={{ width: crest.width, height: crest.height }}
        />
      )}
      {frame && (
        <div
          aria-hidden="true"
          className="inv-frame pointer-events-none absolute inset-3.5 opacity-40"
          // Рамка отступает от вырезанного края, иначе её линия повиснет над вырезом.
          style={edged ? { top: 14 + edgeHeight(top), bottom: 14 + edgeHeight(bottom) } : undefined}
        />
      )}
      {block.ornaments.map((o, i) => {
        // Обёртка появляется (выезжает, проявляется…), картинка внутри потом движется (качается, парит…).
        const { key, wrapper, image } = ornamentMotionProps(o, ornamentMotion, i);
        return (
          <span key={key} aria-hidden="true" {...wrapper} style={{ ...ornamentStyle(o), ...wrapper.style }}>
            <img src={o.src} alt="" data-ornament={i} loading="lazy" {...image} style={{ ...ornamentImageStyle(o), ...image.style }} />
          </span>
        );
      })}
      <div
        // Во всю ширину растягивается фон блока, а текст остаётся в колонке содержимого.
        className={`relative z-10 ${full ? "mx-auto w-full max-w-[430px]" : ""}`}
        style={edged ? { paddingTop: edgePad(top), paddingBottom: edgePad(bottom) } : undefined}
      >
        {(title || script) && (
          <header className="mb-8">
            {title && (
              <h2 className="inv-heading inv-title" data-reveal="1" data-anim="blur" style={textStyle(block, "title")}>
                {title}
              </h2>
            )}
            {script && (
              <p className="inv-script-line">
                <span className="inv-script inline-block" data-reveal="2" data-anim="write" style={textStyle(block, "scriptLine")}>
                  {script}
                </span>
              </p>
            )}
            <div className="inv-divider text-sm" aria-hidden="true" data-reveal="2">
              ♡
            </div>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
