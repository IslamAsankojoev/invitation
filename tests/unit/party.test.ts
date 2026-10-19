import { describe, expect, it } from "vitest";
import {
  beatPulse,
  bubbleCorner,
  findPartyTheme,
  formatTimer,
  partyDate,
  partyThemes,
  passNumber,
  pickRecordingMime,
  rubberBand,
  videoExtension,
} from "@/lib/party";

const bounds = { minX: 0.2, maxX: 0.8, minY: 0.2, maxY: 0.75 };

describe("вечеринки: прототип", () => {
  it("темы различимы, даты событий — в будущем", () => {
    expect(new Set(partyThemes.map((t) => t.id)).size).toBe(partyThemes.length);
    for (const t of partyThemes) expect(t.event.date > "2026-10-18").toBe(true);
    expect(findPartyTheme("нет").id).toBe(partyThemes[0].id);
  });

  it("дата афиши: день.месяц, день недели, время", () => {
    expect(partyDate("2026-10-31T22:00")).toEqual({ dayMonth: "31.10", weekday: "СБ", time: "22:00" });
    expect(partyDate("2026-11-07T23:00").dayMonth).toBe("07.11");
  });

  it("номер пропуска с нулями по числу мест", () => {
    expect(passNumber(27, 80)).toBe("027 / 080");
    expect(passNumber(7, 1200)).toBe("0007 / 1200");
  });

  it("пульс бита: вспышка на доле и затухание к следующей", () => {
    expect(beatPulse(0, 120)).toBeCloseTo(1);
    expect(beatPulse(0.25, 120)).toBeLessThan(0.1);
    expect(beatPulse(0.5, 120)).toBeCloseTo(1);
    expect(beatPulse(-1, 120)).toBe(0);
  });

  it("таймер записи", () => {
    expect(formatTimer(7400)).toBe("0:07");
    expect(formatTimer(75_000)).toBe("1:15");
  });

  it("кружок прилипает к ближайшему углу, бросок переносит его по инерции", () => {
    expect(bubbleCorner({ x: 0.3, y: 0.3 }, { x: 0, y: 0 }, bounds)).toEqual({ x: 0.2, y: 0.2 });
    // Слева, но брошен вправо и вниз — летит в правый нижний угол.
    expect(bubbleCorner({ x: 0.35, y: 0.4 }, { x: 2, y: 1 }, bounds)).toEqual({ x: 0.8, y: 0.75 });
  });

  it("резинка за границей", () => {
    expect(rubberBand(0.5, 0.2, 0.8)).toBe(0.5);
    expect(rubberBand(0.1, 0.2, 0.8)).toBeCloseTo(0.165);
    expect(rubberBand(1, 0.2, 0.8)).toBeCloseTo(0.87);
  });

  it("формат записи: MP4, если браузер умеет, иначе WebM", () => {
    expect(pickRecordingMime((m) => m.startsWith("video/webm"))).toBe("video/webm;codecs=vp9,opus");
    expect(pickRecordingMime((m) => m === "video/mp4")).toBe("video/mp4");
    expect(pickRecordingMime(() => false)).toBeNull();
    expect(videoExtension("video/mp4;codecs=avc1")).toBe("mp4");
    expect(videoExtension("video/webm")).toBe("webm");
  });
});
