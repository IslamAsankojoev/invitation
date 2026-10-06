import { mixHex } from "./color";
import { newEdgeSeed } from "./edges";
import type { Block, Edge, Surface, Theme } from "./schema";
import { palettes } from "./theme";

/**
 * Готовые стили фона блока: один клик ставит сочетание фона, цвета и краёв, которое иначе собирают в «Тонкой
 * настройке» из четырёх мест. Формат не меняется — это только сочетания существующих полей блока.
 */
export const BLOCK_STYLES = ["none", "card", "tint", "dark", "torn", "wave", "paper"] as const;
export type BlockStyleId = (typeof BLOCK_STYLES)[number];

export const blockStyleLabels: Record<BlockStyleId, string> = {
  none: "Без фона",
  card: "Карточка",
  tint: "Цветная полоса",
  dark: "Тёмная полоса",
  torn: "Рваная бумага",
  wave: "Волна",
  paper: "Бумага",
};

type StyleSpec = { surface: Surface; bgColor: string | null; edgeTop: Edge; edgeBottom: Edge };

/** Цвета — от палитры приглашения: светлый акцент и цвет текста (как образцы «Цвета фона» в редакторе). */
export function blockStyleSpec(id: BlockStyleId, theme: Pick<Theme, "palette">): StyleSpec {
  const p = palettes[theme.palette];
  const lightAccent = mixHex(p.accent, "#ffffff", 0.8);
  const plain = (bgColor: string | null, edge: Edge = "none"): StyleSpec => ({ surface: "plain", bgColor, edgeTop: edge, edgeBottom: edge });
  switch (id) {
    case "none":
      return plain(null);
    case "card":
      return { surface: "card", bgColor: null, edgeTop: "none", edgeBottom: "none" };
    case "tint":
      return plain(lightAccent);
    case "dark":
      return plain(p.text);
    case "torn":
      return { surface: "card", bgColor: null, edgeTop: "torn", edgeBottom: "torn" };
    case "wave":
      return plain(lightAccent, "wave");
    case "paper":
      return { surface: "paper", bgColor: null, edgeTop: "none", edgeBottom: "none" };
  }
}

/** Поля блока для стиля. У рваной бумаги — новые зёрна: каждый раз свой обрыв (как при выборе края вручную). */
export function blockStylePatch(id: BlockStyleId, theme: Pick<Theme, "palette">, seed: () => number = newEdgeSeed): Partial<Block> {
  const spec = blockStyleSpec(id, theme);
  return spec.edgeTop === "torn" ? { ...spec, edgeTopSeed: seed(), edgeBottomSeed: seed() } : spec;
}

/** Какой готовый стиль сейчас у блока; null — своё сочетание (собрано в «Тонкой настройке» или шаблоном). */
export function matchBlockStyle(
  block: Pick<Block, "surface" | "bgColor" | "edgeTop" | "edgeBottom">,
  theme: Pick<Theme, "palette">,
): BlockStyleId | null {
  return (
    BLOCK_STYLES.find((id) => {
      const s = blockStyleSpec(id, theme);
      return (
        s.surface === block.surface &&
        (s.bgColor ?? "").toLowerCase() === (block.bgColor ?? "").toLowerCase() &&
        s.edgeTop === block.edgeTop &&
        s.edgeBottom === block.edgeBottom
      );
    }) ?? null
  );
}
