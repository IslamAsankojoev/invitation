import { describe, expect, it } from "vitest";
import { createOrnament } from "@/lib/blocks";
import { idleHasAmplitude, ornamentMotionOf, ornamentMotionProps, resolveIdle } from "@/lib/ornaments";
import { DEFAULT_ORNAMENT_MOTION, type Ornament, type OrnamentMotion } from "@/lib/schema";

const common: OrnamentMotion = { ...DEFAULT_ORNAMENT_MOTION };
const own: OrnamentMotion = { enter: "grow", enterSpeed: 2, idle: "float", idleSpeed: 0.5, idleAmplitude: 2.5 };

describe("анимация украшений", () => {
  it("«авто»: бантик качается на ниточке, остальное — на ветру; явный вид не подменяется", () => {
    expect(resolveIdle("auto", "/library/twine-bow.webp")).toBe("swing");
    expect(resolveIdle("auto", "/library/gardenia.webp")).toBe("sway");
    expect(resolveIdle("float", "/library/twine-bow.webp")).toBe("float");
  });

  it("без своей анимации берётся общая, со своей — своя", () => {
    const o = createOrnament("/library/gardenia.webp");
    expect(ornamentMotionOf(o, common)).toBe(common);
    expect(ornamentMotionOf({ ...o, motion: own }, common)).toBe(own);
  });

  it("общая анимация: сторона выезда, вид движения, множители по умолчанию", () => {
    const { wrapper, image } = ornamentMotionProps(createOrnament("/library/gardenia.webp", "top-left"), common, 0);
    expect(wrapper).toMatchObject({ "data-decor": "left", "data-enter": "auto", "data-decor-own": undefined });
    expect(wrapper.style).toEqual({ "--oe-k": 1 });
    expect(image).toMatchObject({ "data-idle": "sway", "data-alt": undefined });
    expect(image.style).toEqual({ "--oi-k": 1, "--oi-a": 1 });
  });

  it("своя анимация: скорость превращается в множитель длительности, размах — как есть", () => {
    const o = { ...createOrnament("/library/twine-bow.webp", "right"), motion: own };
    const { wrapper, image } = ornamentMotionProps(o, common, 0);
    expect(wrapper).toMatchObject({ "data-decor": "right", "data-enter": "grow", "data-decor-own": "" });
    expect(wrapper.style).toEqual({ "--oe-k": 0.5 });
    expect(image["data-idle"]).toBe("float");
    expect(image.style).toEqual({ "--oi-k": 2, "--oi-a": 2.5 });
  });

  it("соседние украшения качаются вразнобой: у чётных — медленнее и в обратную сторону", () => {
    const { image } = ornamentMotionProps(createOrnament("/library/gardenia.webp"), common, 1);
    expect(image["data-alt"]).toBe("");
    expect(image.style).toMatchObject({ "--oi-k": 1.3 });
  });

  it("любая настройка украшения или его анимации меняет ключ — украшение проигрывает анимацию заново", () => {
    const o = createOrnament("/library/gardenia.webp");
    const key = (patch: Partial<Ornament>, m: OrnamentMotion = common) => ornamentMotionProps({ ...o, ...patch, motion: m }, common, 0).key;
    const base = key({});
    expect(key({}, { ...common, enter: "zoom" })).not.toBe(base);
    expect(key({}, { ...common, enterSpeed: 2 })).not.toBe(base);
    expect(key({}, { ...common, idle: "spin" })).not.toBe(base);
    expect(key({}, { ...common, idleAmplitude: 2 })).not.toBe(base);
    for (const patch of [{ size: o.size + 10 }, { rotate: 15 }, { flip: !o.flip }, { opacity: 0.5 }, { position: "center" as const }]) {
      expect(key(patch)).not.toBe(base);
    }
    // Общая анимация из темы — тоже настройка украшения без своей.
    expect(ornamentMotionProps(o, { ...common, idle: "float" }, 0).key).not.toBe(ornamentMotionProps(o, common, 0).key);
    // Ничего не поменялось — ключ тот же (у гостя украшения не перемонтируются).
    expect(key({})).toBe(base);
  });

  it("у вращения и «стоит на месте» нет размаха", () => {
    expect(idleHasAmplitude("sway")).toBe(true);
    expect(idleHasAmplitude("spin")).toBe(false);
    expect(idleHasAmplitude("none")).toBe(false);
  });
});
