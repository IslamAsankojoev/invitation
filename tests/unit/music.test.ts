import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MUSIC_URL, findTrack, musicTracks } from "@/lib/music";
import { createFromTemplate, findTemplate } from "@/lib/templates";
import { checkUpload } from "@/lib/upload";

describe("встроенная музыка", () => {
  it("каждая песня лежит в public/music, id уникальны, файлы не раздуты (≤ 6 МБ)", () => {
    expect(new Set(musicTracks.map((t) => t.id)).size).toBe(musicTracks.length);
    for (const t of musicTracks) {
      const file = path.join(process.cwd(), "public", t.src);
      expect(existsSync(file), t.src).toBe(true);
      expect(statSync(file).size, t.src).toBeLessThanOrEqual(6 * 1024 * 1024);
    }
  });

  it("новое приглашение сразу с песней по умолчанию", () => {
    expect(createFromTemplate(findTemplate("rose-garden")!).music).toEqual({ url: DEFAULT_MUSIC_URL, loop: true });
    expect(findTrack(DEFAULT_MUSIC_URL)?.title).toBe("Perfect");
    expect(findTrack("/uploads/old.mp3")).toBeNull();
  });

  it("свою mp3 загрузить пока нельзя, картинки — можно", () => {
    expect(checkUpload("audio/mpeg", 1000)).toMatch(/Своя музыка пока недоступна/);
    expect(checkUpload("image/png", 1000)).toBeNull();
  });
});
