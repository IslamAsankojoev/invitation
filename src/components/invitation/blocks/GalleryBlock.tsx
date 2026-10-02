"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Section } from "../Section";
import { EmptyPhotos } from "./PhotoBlock";
import type { BlockProps } from "./types";

/** Наклоны фото в коллаже — по кругу, чтобы снимки лежали «вразброс», но одинаково у всех гостей. */
const TILTS = [-4, 3, -2, 5, -3, 2, -5, 4, -1];

/** Колонки сетки: одно фото — во всю ширину, кратно трём или много — в три колонки, иначе в две. */
export function galleryColumns(n: number) {
  return n <= 1 ? 1 : n % 3 === 0 || n >= 7 ? 3 : 2;
}

/** 2–9 фото: сетка, коллаж или лента с прокруткой; по нажатию фото открывается во весь экран. */
export function GalleryBlock({ block, ctx }: BlockProps<"gallery">) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = block.photos;
  if (!photos.length) {
    return ctx.preview ? (
      <Section block={block}>
        <EmptyPhotos text="Добавьте фото в редакторе" />
      </Section>
    ) : null;
  }
  // В превью редактора фото не открываются: окно во весь экран закрыло бы редактор.
  const show = (i: number) => () => !ctx.preview && setOpen(i);
  const label = (i: number) => `Открыть фото ${i + 1} из ${photos.length}`;

  let body;
  if (block.variant === "collage") {
    body = (
      <div className="flex flex-wrap justify-center px-2 py-4">
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={label(i)}
            onClick={show(i)}
            className="inv-polaroid -m-1.5 w-[46%] p-1.5 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)`, zIndex: i % 2 ? 1 : undefined }}
            data-reveal={i + 2}
            data-anim="drop"
          >
            <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    );
  } else if (block.variant === "carousel") {
    body = (
      // Лента выходит за поля блока, чтобы соседнее фото «выглядывало» и было понятно, что её листают.
      <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none]" data-reveal="2" data-anim="right">
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={label(i)}
            onClick={show(i)}
            className="w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <img src={src} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          </button>
        ))}
      </div>
    );
  } else {
    const cols = galleryColumns(photos.length);
    body = (
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={label(i)}
            onClick={show(i)}
            // Нечётное число в две колонки — первое фото на всю ширину, чтобы не осталось дырки.
            className={`overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${cols === 2 && photos.length % 2 && i === 0 ? "col-span-2" : ""}`}
            data-reveal={Math.min(i + 2, 6)}
            data-anim="fade"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className={`w-full object-cover ${cols === 1 || (cols === 2 && photos.length % 2 && i === 0) ? "aspect-[4/3]" : "aspect-square"}`}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <Section block={block}>
      {body}
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Section>
  );
}

/** Фото во весь экран: стрелки, Escape, нажатие на фон закрывает. */
function Lightbox({ photos, index, onIndex, onClose }: { photos: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const go = (d: number) => onIndex((index + d + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
    };
  });

  const arrow = "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20";
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Фото ${index + 1} из ${photos.length}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <img src={photos[index]} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" aria-label="Закрыть" autoFocus onClick={onClose} className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Предыдущее фото" className={`${arrow} left-3`} onClick={(e) => (e.stopPropagation(), go(-1))}>
            <ChevronLeft />
          </button>
          <button type="button" aria-label="Следующее фото" className={`${arrow} right-3`} onClick={(e) => (e.stopPropagation(), go(1))}>
            <ChevronRight />
          </button>
        </>
      )}
      <p className="absolute bottom-4 text-sm text-white/70">
        {index + 1} / {photos.length}
      </p>
    </div>,
    document.body,
  );
}
