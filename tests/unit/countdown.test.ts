import { describe, expect, it } from "vitest";
import { getCountdown } from "@/lib/countdown";

describe("getCountdown", () => {
  it("считает дни, часы, минуты и секунды", () => {
    const now = new Date(2027, 0, 1, 10, 0, 0);
    const target = new Date(2027, 0, 4, 13, 25, 30);
    expect(getCountdown(target, now)).toEqual({ done: false, days: 3, hours: 3, minutes: 25, seconds: 30 });
  });

  it("меньше суток — 0 дней", () => {
    const now = new Date(2027, 0, 1, 23, 59, 0);
    expect(getCountdown(new Date(2027, 0, 2, 0, 0, 0), now)).toEqual({
      done: false, days: 0, hours: 0, minutes: 1, seconds: 0,
    });
  });

  it("прошедшая или текущая дата → done", () => {
    const now = new Date(2027, 0, 1);
    expect(getCountdown(new Date(2026, 11, 31), now)).toEqual({ done: true });
    expect(getCountdown(now, now)).toEqual({ done: true });
  });
});
