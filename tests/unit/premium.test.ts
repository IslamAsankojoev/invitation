import { describe, expect, it } from "vitest";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { library } from "@/lib/library";
import { premiumUsage } from "@/lib/premium";

describe("premiumUsage", () => {
  it("новое приглашение по шаблону — без платных элементов", () => {
    expect(premiumUsage(createDefaultInvitation())).toEqual([]);
  });

  it("перечисляет платные вид блока, стиль, заставку, шрифт, фон и картинки — без повторов", () => {
    let data = createDefaultInvitation();
    data = updateBlock(data, "hero", { variant: "polaroid" });
    data = updateBlock(data, "calendar", { variant: "week", surface: "frame" });
    data = updateBlock(data, "story", { surface: "frame" });
    const proAsset = library.find((a) => a.premium)!;
    data = updateBlock(data, "location", {
      ornaments: [{ src: proAsset.src, position: "top", size: 100, rotate: 0, flip: false, opacity: 1 }],
    });
    data.theme = { ...data.theme, font: "gabriela", motion: { style: "cinematic", speed: 1 }, envelope: { ornament: proAsset.src, style: "book" } };

    expect(premiumUsage(data)).toEqual([
      "Анимации «Кино»",
      "Заставка «Книга»",
      "Шрифт Gabriela",
      "Картинки из PRO-библиотеки",
      "Главный экран: вид «Полароид»",
      "Календарь: вид «Неделя»",
      "Фон блока «Золочёная рама»",
    ]);
  });

  it("скрытый блок в платном виде не считается", () => {
    const data = updateBlock(createDefaultInvitation(), "calendar", { variant: "tearoff", visible: false });
    expect(premiumUsage(data)).toEqual([]);
  });
});
