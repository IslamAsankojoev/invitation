import { MapPin } from "lucide-react";
import { textStyle } from "@/lib/textStyle";
import { findBlock } from "@/lib/blocks";
import { monogram } from "@/lib/calendar";
import { Section } from "../Section";
import type { BlockProps } from "./types";

function MapButton({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <div className="mt-8" data-reveal="4">
      <a href={url} target="_blank" rel="noopener noreferrer" className="inv-btn-outline inv-btn-shine">
        Посмотреть на карте
      </a>
    </div>
  );
}

export function LocationBlock({ block, ctx }: BlockProps<"location">) {
  if (block.variant === "postcard") {
    const names = findBlock(ctx.data, "hero")?.names ?? "";
    return (
      <Section block={block}>
        <div className="inv-postcard relative mx-auto max-w-sm p-3 pb-6 text-left text-[#3e3630]" style={{ transform: "rotate(1.5deg)" }} data-reveal="2" data-anim="drop">
          {block.photo && <img src={block.photo} alt={block.placeName} className="aspect-[4/3] w-full object-cover" />}
          <div className="relative px-3 pt-5">
            <span aria-hidden="true" className="inv-stamp absolute -top-9 right-2 flex h-16 w-14 items-center justify-center text-lg">
              {monogram(names)}
            </span>
            <span aria-hidden="true" className="inv-postmark absolute -top-8 right-14" />
            <p className="inv-caps text-[0.7rem] opacity-60">Ждём вас по адресу</p>
            <p className="inv-postcard-line mt-2 text-3xl" style={{ fontFamily: "var(--font-title)", ...textStyle(block, "placeName") }} data-field="placeName">
              {block.placeName}
            </p>
            <p className="inv-postcard-line mt-1 text-xl italic" style={textStyle(block, "address")} data-field="address">{block.address}</p>
          </div>
        </div>
        <MapButton url={block.mapUrl} />
      </Section>
    );
  }

  if (block.variant === "minimal") {
    return (
      <Section block={block}>
        <div className="inv-plaque mx-auto max-w-xs px-6 py-8" data-reveal="2" data-anim="fade">
          <MapPin aria-hidden="true" strokeWidth={1.2} className="mx-auto size-8 text-[var(--accent)]" />
          <p className="inv-heading mt-4 text-lg" style={textStyle(block, "placeName")} data-field="placeName">{block.placeName}</p>
          <div className="inv-divider text-xs" aria-hidden="true">
            ✦
          </div>
          <p className="mt-3 text-lg leading-snug opacity-80" style={textStyle(block, "address")} data-field="address">{block.address}</p>
        </div>
        <MapButton url={block.mapUrl} />
      </Section>
    );
  }

  return (
    <Section block={block}>
      {block.photo && (
        // Фото раскрывается шторкой снизу вверх, картинка внутри мягко отдаляется.
        <div className="mb-8 aspect-[4/3] w-full overflow-hidden rounded-2xl" data-reveal="2" data-anim="curtain">
          <img src={block.photo} alt={block.placeName} className="h-full w-full object-cover" />
        </div>
      )}
      <div data-reveal="3">
        <p className="inv-heading text-lg" style={textStyle(block, "placeName")} data-field="placeName">{block.placeName}</p>
        <p className="mx-auto mt-3 max-w-xs text-lg leading-snug opacity-80" style={textStyle(block, "address")} data-field="address">{block.address}</p>
      </div>
      <MapButton url={block.mapUrl} />
    </Section>
  );
}
