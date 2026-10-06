import { describe, expect, it } from "vitest";
import { BLOCK_STYLES, blockStylePatch, matchBlockStyle } from "@/lib/blockStyles";
import { createDefaultInvitation } from "@/lib/defaults";
import { invitationDataSchema, PALETTES, type Block } from "@/lib/schema";

describe("готовые стили фона блока", () => {
  const data = createDefaultInvitation();
  const location = data.blocks.find((b) => b.type === "location")!;

  it("каждый стиль на каждой палитре даёт валидное приглашение и узнаётся обратно", () => {
    for (const palette of PALETTES) {
      const theme = { palette };
      for (const id of BLOCK_STYLES) {
        const block = { ...location, ...blockStylePatch(id, theme) } as Block;
        const parsed = invitationDataSchema.safeParse({ ...data, theme: { ...data.theme, palette }, blocks: [block] });
        expect(parsed.success, `${palette}/${id}`).toBe(true);
        expect(matchBlockStyle(block, theme), `${palette}/${id}`).toBe(id);
      }
    }
  });

  it("стиль меняет только фон, цвет и края — тексты, фото, украшения, картинка и прозрачность остаются", () => {
    const block = { ...location, bgImage: "/uploads/x.webp", surfaceOpacity: 0.6 };
    const next = { ...block, ...blockStylePatch("dark", data.theme) } as typeof block;
    for (const key of ["placeName", "address", "photo", "ornaments", "bgImage", "surfaceOpacity", "title", "variant"] as const) {
      expect(next[key]).toEqual(block[key]);
    }
  });

  it("рваная бумага — новые зёрна обрыва, остальные стили зёрна не трогают", () => {
    let n = 41;
    const torn = blockStylePatch("torn", data.theme, () => n++);
    expect(torn).toMatchObject({ edgeTop: "torn", edgeBottom: "torn", edgeTopSeed: 41, edgeBottomSeed: 42 });
    expect(blockStylePatch("wave", data.theme)).not.toHaveProperty("edgeTopSeed");
  });

  it("своё сочетание — не стиль из списка", () => {
    expect(matchBlockStyle({ surface: "notebook", bgColor: null, edgeTop: "none", edgeBottom: "none" }, data.theme)).toBeNull();
    expect(matchBlockStyle({ surface: "plain", bgColor: "#123456", edgeTop: "none", edgeBottom: "none" }, data.theme)).toBeNull();
    // Цвет сравнивается без учёта регистра.
    const dark = blockStylePatch("dark", data.theme);
    expect(matchBlockStyle({ ...(dark as Required<typeof dark>), bgColor: dark.bgColor!.toUpperCase() } as Block, data.theme)).toBe("dark");
  });
});
