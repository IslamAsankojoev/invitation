"use client";

import { memo, useMemo } from "react";
import { InvitationView } from "@/components/invitation/InvitationView";
import { FieldLabel } from "@/components/ui/field";
import { isPremiumVariant } from "@/lib/premium";
import { BLOCK_VARIANTS, type Block, type BlockType, type InvitationData } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { variantLabels, type VariantOf } from "@/lib/variants";
import { ProBadge } from "./controls";

const PREVIEW_WIDTH = 390;
/** Миниатюры мелкие (3 в ряд): «Вид блока» — не главное в блоке, он не должен занимать полэкрана. */
const SCALE = 0.3;

type Props = { data: InvitationData; block: Block; onChange: (variant: Block["variant"]) => void };

/** Плитки «Вид блока»: в каждой — настоящий блок этого вида в миниатюре, без анимаций. */
export function VariantPicker({ data, block, onChange }: Props) {
  const variants = BLOCK_VARIANTS[block.type] as readonly string[];
  if (variants.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Вид блока</FieldLabel>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Вид блока">
        {variants.map((v) => {
          const label = (variantLabels[block.type] as Record<string, string>)[v];
          const selected = block.variant === v;
          // Миниатюра содержит свои кнопки, поэтому плитка — не обёртка-кнопка, а прозрачная кнопка поверх
          // (вложенные <button> = ошибка гидратации).
          return (
            <div
              key={v}
              className={cn(
                "relative overflow-hidden rounded-lg border bg-card transition has-[>button:hover]:border-ring has-[>button:focus-visible]:ring-3 has-[>button:focus-visible]:ring-ring/50",
                selected && "border-primary ring-2 ring-primary/25",
              )}
            >
              <VariantThumb data={data} id={block.id} type={block.type} variant={v} />
              <span className="flex items-center justify-between gap-1 border-t px-1.5 py-1 text-[11px] leading-tight">
                <span className="truncate">{label}</span>
                {isPremiumVariant(block.type, v as VariantOf<BlockType>) && <ProBadge />}
              </span>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`Вид «${label}»`}
                onClick={() => onChange(v as Block["variant"])}
                className="absolute inset-0 outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Миниатюра: приглашение, в котором виден только этот блок в нужном виде. Главный экран сжат по высоте. */
const VariantThumb = memo(function VariantThumb({ data, id, type, variant }: { data: InvitationData; id: string; type: BlockType; variant: string }) {
  const thumb = useMemo<InvitationData>(
    () => ({ ...data, blocks: data.blocks.map((b) => ({ ...b, visible: b.id === id, ...(b.id === id ? { variant } : {}) }) as Block) }),
    [data, id, variant],
  );
  // У обложки видна верхняя часть — по ней виды и различаются.
  const height = type === "hero" ? 430 : 340;
  return (
    <div aria-hidden="true" inert className={cn("pointer-events-none relative overflow-hidden")} style={{ height: height * SCALE }}>
      <div className="absolute top-0 left-1/2 origin-top" style={{ width: PREVIEW_WIDTH, height, transform: `translateX(-50%) scale(${SCALE})` }}>
        <div className="h-full [&_[data-block=hero]]:min-h-[560px] [&_main]:pb-0">
          <InvitationView data={thumb} slug="preview" preview motion="off" />
        </div>
      </div>
    </div>
  );
});
