import { describe, expect, it } from "vitest";
import { burstSparks, createParticles, DENSITY_LEVELS, densityLevel, densityOf, decorDrawers, edgeFade, fitParticles, hitParticle, MIN_HIT_RADIUS, particleCenter, respawnParticle, sparkColors, stepParticle, stepSparks } from "@/lib/decor";

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

describe("мини-игра: частицы лопаются от касания", () => {
  const drawer = decorDrawers.snow;
  const flake = (x: number, y: number, size = 2) => ({ x, y, size, speed: 30, rotation: 0, spin: 0, phase: 0, alpha: 1 });

  it("попадание — ближайшая частица; мелкую снежинку можно задеть пальцем (радиус не меньше 22 px)", () => {
    const particles = [flake(100, 100), flake(130, 100), flake(300, 300)];
    expect(hitParticle(particles, drawer, 118, 100)).toBe(1);
    expect(hitParticle(particles, drawer, 100 - MIN_HIT_RADIUS + 1, 100)).toBe(0);
    expect(hitParticle(particles, drawer, 100 - MIN_HIT_RADIUS - 1, 100)).toBe(-1);
    expect(hitParticle(particles, drawer, 200, 200)).toBe(-1);
  });

  it("попадание учитывает покачивание частицы, как она нарисована", () => {
    const p = { ...flake(100, 100), phase: Math.PI / 2 };
    const c = particleCenter(p, decorDrawers.petals);
    expect(c.x).toBeCloseTo(100 + decorDrawers.petals.sway * 0.3);
    expect(hitParticle([p], decorDrawers.petals, c.x, c.y)).toBe(0);
  });

  it("лопнувшая частица возвращается выше экрана — декор не редеет", () => {
    const p = flake(100, 400);
    respawnParticle(p, 390, () => 0.5);
    expect(p.y).toBeLessThan(0);
    expect(p.x).toBe(195);
  });

  it("хлопок: конфетти в цветах декора разлетаются и падают, потом исчезают", () => {
    let sparks = burstSparks(50, 50, "#c0392b", 12, () => 0.5);
    expect(sparks).toHaveLength(12);
    expect(new Set(sparks.map((s) => s.color))).toEqual(new Set(sparkColors("#c0392b")));
    expect(sparkColors("#c0392b")).not.toContain("#ffffff"); // белое конфетти не видно на светлой бумаге
    const piece = sparks[0];
    const startY = piece.y;
    for (let t = 0; t < 0.6; t += 0.05) sparks = stepSparks(sparks, 0.05);
    expect(piece.y).toBeGreaterThan(startY); // гравитация
    for (let t = 0; t < 2; t += 0.05) sparks = stepSparks(sparks, 0.05);
    expect(sparks).toHaveLength(0);
  });
});

describe("«Сколько декора»: Мало / Средне / Много", () => {
  it("уровни растут, укладываются в границы схемы и узнаются обратно", () => {
    const values = DENSITY_LEVELS.map(densityOf);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    for (const level of DENSITY_LEVELS) {
      expect(densityOf(level)).toBeGreaterThan(0);
      expect(densityOf(level)).toBeLessThanOrEqual(60);
      expect(densityLevel(densityOf(level))).toBe(level);
    }
  });

  it("своя плотность — ни один уровень", () => {
    expect(densityLevel(14)).toBeNull();
    expect(densityLevel(0)).toBeNull();
  });
});
