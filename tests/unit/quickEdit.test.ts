import { describe, expect, it } from "vitest";
import { findBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { isQuickEditField, quickEditPatch, quickEditValue } from "@/lib/quickEdit";
import { SUBTITLE_PRESETS } from "@/lib/quickStart";
import { heroBlockSchema } from "@/lib/schema";

describe("быстрая правка в превью", () => {
  const data = createDefaultInvitation();

  it("простые надписи — да; программа, контакты, дата — нет (они в панели)", () => {
    for (const f of ["names", "label", "subtitle", "title", "scriptLine", "text", "placeName", "address", "caption"]) {
      expect(isQuickEditField(f)).toBe(true);
    }
    for (const f of ["time", "itemTitle", "personName", "date", "toString", undefined]) expect(isQuickEditField(f)).toBe(false);
  });

  it("значение — как в приглашении: заголовок без своего текста — стандартный", () => {
    expect(quickEditValue(findBlock(data, "hero")!, "names")).toBe("Анна & Иван");
    expect(quickEditValue(findBlock(data, "program")!, "title")).toBe("Программа дня");
    expect(quickEditValue(findBlock(data, "hero")!, "caption")).toBe("");
    expect(quickEditPatch("placeName", "Ала-Тоо")).toEqual({ placeName: "Ала-Тоо" });
  });

  it("готовые фразы подзаголовка проходят схему", () => {
    for (const text of SUBTITLE_PRESETS) expect(heroBlockSchema.shape.subtitle.safeParse(text).success).toBe(true);
  });
});
