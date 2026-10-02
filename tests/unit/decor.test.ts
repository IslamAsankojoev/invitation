import { describe, expect, it } from "vitest";
import { createParticles, decorDrawers, edgeFade, fitParticles, stepParticle } from "@/lib/decor";

describe("createParticles", () => {
  const drawer = decorDrawers.image;
  const [min, max] = drawer.sizeRange;

  it("создаёт столько частиц, сколько задано плотностью", () => {
    expect(createParticles(14, 400, 800, drawer)).toHaveLength(14);
    expect(createParticles(0, 400, 800, drawer)).toEqual([]);
  });

  it("множитель размера масштабирует частицы", () => {
    const sizes = (scale: number) => createParticles(50, 400, 800, drawer, scale).map((p) => p.size);
    const within = (scale: number) =>
      sizes(scale).every((s) => s >= min * scale && s <= max * scale);
    expect(within(1)).toBe(true);
    expect(within(2)).toBe(true);
    expect(within(0.5)).toBe(true);
    expect(Math.min(...sizes(2))).toBeGreaterThan(max);
  });

  it("при одинаковом случайном генераторе размер ровно пропорционален множителю", () => {
    const rand = () => 0.5;
    const [a] = createParticles(1, 400, 800, drawer, 1, rand);
    const [b] = createParticles(1, 400, 800, drawer, 2.5, rand);
    expect(b.size).toBeCloseTo(a.size * 2.5);
  });
});

describe("stepParticle", () => {
  it("множитель скорости ускоряет падение", () => {
    const [a] = createParticles(1, 400, 800, decorDrawers.petals, 1, () => 0.5);
    const b = { ...a };
    stepParticle(a, 1, 400, 800);
    stepParticle(b, 1, 400, 800, 2);
    expect(b.y - 400).toBeCloseTo((a.y - 400) * 2);
  });
});

describe("edgeFade", () => {
  it("частица проявляется вверху, видна в середине и гаснет внизу", () => {
    expect(edgeFade(0, 1000)).toBe(0);
    expect(edgeFade(50, 1000)).toBeCloseTo(0.5);
    expect(edgeFade(500, 1000)).toBe(1);
    expect(edgeFade(925, 1000)).toBeCloseTo(0.5);
    expect(edgeFade(1000, 1000)).toBe(0);
  });
});

describe("fitParticles", () => {
  it("сохраняет частицы и их относительное положение при смене размера, не мутируя вход", () => {
    const particles = createParticles(3, 400, 800, decorDrawers.petals, 1, () => 0.5);
    const snapshot = structuredClone(particles);
    const fitted = fitParticles(particles, { width: 400, height: 800 }, { width: 400, height: 880 });
    expect(fitted).toHaveLength(3);
    expect(fitted[0]).toMatchObject({ x: 200, size: particles[0].size, speed: particles[0].speed });
    expect(fitted[0].y).toBeCloseTo(440);
    expect(particles).toEqual(snapshot);
  });

  it("с нулевого размера ничего не растягивает", () => {
    const [p] = createParticles(1, 400, 800, decorDrawers.petals, 1, () => 0.5);
    expect(fitParticles([p], { width: 0, height: 0 }, { width: 400, height: 800 })[0]).toMatchObject({ x: p.x, y: p.y });
  });
});
