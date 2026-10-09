"use client";

import { useState, type CSSProperties } from "react";
import type { PhotoHeight } from "@/lib/schema";
import { textStyle } from "@/lib/textStyle";
import { Section } from "../Section";
import type { BlockProps } from "./types";

/** Пока фото нет: в превью — подсказка, гость блок не видит. */
export function EmptyPhotos({ text }: { text: string }) {
  return (
    <div className="mx-auto flex aspect-[4/3] max-w-sm items-center justify-center rounded-2xl border border-dashed border-[var(--accent)]/60 px-8 text-base opacity-70">
      {text}
    </div>
  );
}

/** Размер кадра: квадрат, на экран или по пропорциям снимка (узнаём после загрузки, до неё — 4:5). */
function useFrame(height: PhotoHeight) {
  const [ratio, setRatio] = useState<number | null>(null);
  const style: CSSProperties =
    height === "square" ? { aspectRatio: "1" } : height === "screen" ? { height: "min(100svh, 780px)" } : { aspectRatio: ratio ?? 0.8 };
  const measure = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth) setRatio(img.naturalWidth / img.naturalHeight);
  };
  // ref — на случай, если картинка загрузилась из кэша раньше гидратации и onLoad уже не придёт.
  return [style, { ref: measure, onLoad: (e: { currentTarget: HTMLImageElement }) => measure(e.currentTarget) }] as const;
}

/** Одно фото: во всю ширину блока (режется краями блока), в рамке или полароидом; подпись — по желанию. */
export function PhotoBlock({ block, ctx }: BlockProps<"photo">) {
  const [frame, measure] = useFrame(block.height);
  if (!block.photo) {
    return ctx.preview ? (
      <Section block={block}>
        <EmptyPhotos text="Загрузите фото в редакторе" />
      </Section>
    ) : null;
  }
  const caption = block.caption?.trim();

  if (block.variant === "polaroid") {
    return (
      <Section block={block}>
        <figure className="inv-polaroid relative mx-auto w-[80%] max-w-[320px]" data-reveal="2" data-anim="drop">
          <img src={block.photo} alt={caption ?? ""} className="w-full object-cover" style={frame} {...measure} />
          <figcaption className="inv-script min-h-8 px-2 pt-2 pb-1 text-2xl text-[#3e3630]" style={textStyle(block, "caption")} data-field="caption">
            {caption}
          </figcaption>
        </figure>
      </Section>
    );
  }

  if (block.variant === "frame") {
    return (
      <Section block={block}>
        <figure className="relative mx-auto w-[86%] max-w-[340px]">
          <span aria-hidden="true" className="absolute top-3 left-3 -right-3 -bottom-3 border border-[var(--accent)]/60" data-reveal="3" data-anim="fade" />
          <div className="relative overflow-hidden" data-reveal="2" data-anim="curtain">
            <img src={block.photo} alt={caption ?? ""} className="w-full object-cover" style={frame} {...measure} />
          </div>
          {caption && (
            <figcaption className="mt-8 text-lg italic opacity-80" data-reveal="4" style={textStyle(block, "caption")} data-field="caption">
              {caption}
            </figcaption>
          )}
        </figure>
      </Section>
    );
  }

  // Во всю ширину: фото — заливка блока (края блока режут его, как фото обложки), подпись — поверх, внизу.
  return (
    <Section
      block={block}
      bare
      className="flex flex-col justify-end"
      // Во всю ширину на компьютере пропорции снимка дали бы блок выше экрана — ограничиваем, фото обрежется.
      style={block.height === "screen" ? frame : { ...frame, maxHeight: "min(88svh, 760px)" }}
      fill={
        <>
          <img
            src={block.photo}
            alt={caption ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
            data-reveal="1"
            data-anim="fade"
            {...measure}
          />
          {caption && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />}
        </>
      }
    >
      {caption && (
        <p className="px-8 pb-10 text-xl text-white italic [text-shadow:0_1px_8px_rgba(0,0,0,.45)]" data-reveal="2" style={textStyle(block, "caption")} data-field="caption">
          {caption}
        </p>
      )}
    </Section>
  );
}
