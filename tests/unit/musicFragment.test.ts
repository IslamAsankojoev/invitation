import { describe, expect, it } from "vitest";
import { computePeaks, FADE_OUT, fadeOutVolume, formatTime, fragmentOf, fragmentStep, isWholeTrack, MIN_FRAGMENT, moveHandle } from "@/lib/musicFragment";

describe("фрагмент песни", () => {
  it("границы — в пределах трека, конец не раньше начала + минимум; без конца — до конца трека", () => {
    expect(fragmentOf({ start: 0, end: null }, 200)).toEqual({ start: 0, end: 200 });
    expect(fragmentOf({ start: 30, end: 90 }, 200)).toEqual({ start: 30, end: 90 });
    expect(fragmentOf({ start: 30, end: 31 }, 200)).toEqual({ start: 30, end: 30 + MIN_FRAGMENT });
    expect(fragmentOf({ start: 500, end: 900 }, 200)).toEqual({ start: 200 - MIN_FRAGMENT, end: 200 });
    // Длина ещё неизвестна (метаданные не загружены) — как задано.
    expect(fragmentOf({ start: 30, end: null }, NaN)).toEqual({ start: 30, end: Infinity });
  });

  it("на конце фрагмента — повтор или остановка; раньше — ничего", () => {
    const f = { start: 30, end: 90 };
    expect(fragmentStep(60, f, true)).toBeNull();
    expect(fragmentStep(90, f, true)).toBe("restart");
    expect(fragmentStep(90.2, f, false)).toBe("stop");
  });

  it("в конце всегда плавное затухание: громкость 1, а за FADE_OUT секунд до конца — к нулю", () => {
    const f = { start: 0, end: 100 };
    expect(fadeOutVolume(50, f)).toBe(1);
    expect(fadeOutVolume(100 - FADE_OUT, f)).toBe(1);
    expect(fadeOutVolume(100 - FADE_OUT / 2, f)).toBeCloseTo(0.5);
    expect(fadeOutVolume(100, f)).toBe(0);
    expect(fadeOutVolume(10, { start: 0, end: Infinity })).toBe(1);
  });

  it("весь трек и формат времени", () => {
    expect(isWholeTrack({ start: 0, end: null })).toBe(true);
    expect(isWholeTrack({ start: 5, end: null })).toBe(false);
    expect(formatTime(83.4)).toBe("1:23");
    expect(formatTime(5)).toBe("0:05");
  });
});

describe("волна и ручки фрагмента", () => {
  it("пики: максимум по модулю в каждом куске, нормированы к самому громкому", () => {
    const samples = new Float32Array(400);
    samples.fill(0.1, 0, 200);
    samples.fill(-0.5, 200, 400);
    const peaks = computePeaks(samples, 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[0]).toBeCloseTo(0.2);
    expect(peaks[3]).toBe(1);
  });

  it("ручки: шаг 0.5 с, в пределах трека, между ними не меньше минимума; конец у края — «до конца трека»", () => {
    const f = { start: 10, end: 60 };
    expect(moveHandle(f, "start", 20.3, 200)).toEqual({ start: 20.5, end: 60 });
    expect(moveHandle(f, "start", -5, 200)).toEqual({ start: 0, end: 60 });
    expect(moveHandle(f, "start", 59, 200)).toEqual({ start: 60 - MIN_FRAGMENT, end: 60 });
    expect(moveHandle(f, "end", 11, 200)).toEqual({ start: 10, end: 10 + MIN_FRAGMENT });
    expect(moveHandle(f, "end", 199.9, 200)).toEqual({ start: 10, end: null });
    // Начало двигают, а конец был «до конца трека» — так и остаётся.
    expect(moveHandle({ start: 10, end: 200 }, "start", 30, 200)).toEqual({ start: 30, end: null });
  });
});
