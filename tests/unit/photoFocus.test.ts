import { describe, expect, it } from "vitest";
import { focusFromPoint, focusPosition, photoStyle } from "@/lib/photoFocus";
import { findBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { heroBlockSchema } from "@/lib/schema";

describe("главное место на фото", () => {
  it("позиция для CSS; нет точки — центр по умолчанию", () => {
    expect(focusPosition({ x: 30, y: 20 })).toBe("30% 20%");
    expect(focusPosition(undefined)).toBeUndefined();
    expect(photoStyle({ photoFocus: { x: 10, y: 90 } })).toEqual({ objectPosition: "10% 90%" });
    expect(photoStyle({})).toEqual({});
  });

  it("точка по нажатию — проценты картинки, в пределах 0–100", () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };
    expect(focusFromPoint(rect, 150, 75)).toEqual({ x: 25, y: 25 });
    expect(focusFromPoint(rect, 0, 500)).toEqual({ x: 0, y: 100 });
  });

  it("схема: только 0–100; без точки — тоже валидно (старые приглашения)", () => {
    const { photoFocus: _, ...hero } = findBlock(createDefaultInvitation(), "hero")!;
    expect(heroBlockSchema.safeParse({ ...hero, photoFocus: { x: 50, y: 0 } }).success).toBe(true);
    expect(heroBlockSchema.safeParse({ ...hero, photoFocus: { x: 120, y: 0 } }).success).toBe(false);
    expect(heroBlockSchema.parse(hero).photoFocus).toBeUndefined();
  });
});
