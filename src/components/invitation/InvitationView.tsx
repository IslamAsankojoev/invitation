import type { ComponentType } from "react";
import { isFullWidth } from "@/lib/library";
import type { Block, InvitationData } from "@/lib/schema";
import { headingsMode, palettes, themeStyle } from "@/lib/theme";
import { blockComponents } from "./blocks/registry";
import type { BlockContext } from "./blocks/types";
import { MotionContext, OrnamentMotionContext, type Motion } from "./motion";
import { PageBackground } from "./PageBackground";
import { TextureLayer } from "./TextureLayer";

type Props = {
  data: InvitationData;
  slug: string;
  preview?: boolean;
  /** Анимации: гостю — «paused» до открытия конверта, мини-превью шаблонов — «off». */
  motion?: Motion;
  /** Превью редактора: блок, открытый в панели, — его обёртка помечена data-selected (рамку рисует CSS редактора). */
  selectedBlockId?: string | null;
};

/** Общий шаблон приглашения — его видят гости и превью в редакторе. */
export function InvitationView({ data, slug, preview = false, motion: requested = "on", selectedBlockId }: Props) {
  const ctx: BlockContext = { data, slug, preview };
  const { style, speed } = data.theme.motion;
  // Стиль «Без анимаций» — то же, что статичный режим: всё видно сразу.
  const motion: Motion = style === "none" ? "off" : requested;

  return (
    <div
      data-testid="invitation"
      data-motion={motion}
      data-style={style}
      data-headings={headingsMode(data.theme)}
      // overflow-clip, а не hidden: hidden делает корень скролл-контейнером, и sticky-фон (PageBackground) не прилипал бы.
      className={`relative min-h-full overflow-clip bg-[var(--bg)] text-[var(--text)] ${motion === "off" ? "" : "inv-motion"}`}
      style={{
        ...themeStyle(data.theme),
        ["--inv-speed" as string]: speed,
        fontFamily: "var(--font-body)",
      }}
    >
      <MotionContext.Provider value={motion}>
      <OrnamentMotionContext.Provider value={data.theme.ornamentMotion}>
        <PageBackground theme={data.theme} />
        <TextureLayer texture={data.theme.texture} dark={palettes[data.theme.palette].dark} />
        {/* Колонка содержимого — 430 px; блок «во всю ширину» выходит на всю ширину экрана (его текст — в колонке). */}
        <main className="relative pb-24">
          {data.blocks
            .filter((b) => b.visible)
            .map((block) => {
              const Component = blockComponents[block.type] as ComponentType<{ block: Block; ctx: BlockContext }>;
              return (
                <div
                  key={block.id}
                  // В превью редактора обёртка — цель выбора блока нажатием (рамка наведения и выбранного — editor-pick в globals.css).
                  data-pick={preview ? block.id : undefined}
                  data-selected={preview && selectedBlockId === block.id ? "" : undefined}
                  className={`${isFullWidth(block) ? "" : "mx-auto max-w-[430px]"} ${preview ? "relative" : ""}`}
                >
                  <Component block={block} ctx={ctx} />
                </div>
              );
            })}
        </main>
      </OrnamentMotionContext.Provider>
      </MotionContext.Provider>
    </div>
  );
}
