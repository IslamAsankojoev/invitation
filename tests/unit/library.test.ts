import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { categoryLabels, library, surfaceGroups, surfaceLabels, surfaceLayer, surfaceObjects, surfaceTextures } from "@/lib/library";
import { SURFACES } from "@/lib/schema";

const publicDir = path.join(process.cwd(), "public");
const credits = readFileSync(path.join(publicDir, "library/CREDITS.md"), "utf8");
/** Строка CREDITS.md для файла внутри public/library (например, `surfaces/scroll.webp`). */
const creditRow = (file: string) => credits.split("\n").find((line) => line.includes(`\`${file}\``));
/** Допустимые статусы: свободные лицензии, купленная у автора и «уточняется» (pngwing — до покупки). */
const LICENSE = /\| (CC0|Public domain|Unsplash License|Лицензия приобретена|уточняется[^|]*) \|/;
/** Картинки первой версии библиотеки (свои, до CREDITS.md); всё новое растровое — только со строкой в CREDITS. */
const IN_HOUSE = [
  "dried-botanical",
  "gardenia",
  "white-roses",
  "rose-lilac",
  "peach-rose",
  "pink-roses",
  "red-roses",
  "nasturtium",
  "maple-leaf",
  "twine-bow",
  "twine-bow-wide",
  "gold-swirl",
  "brush-stroke",
  "petal-red",
  "petal-pink",
  "leaf-particle",
];

describe("библиотека картинок", () => {
  it("у каждой записи есть файл, id уникальны, категория подписана", () => {
    expect(new Set(library.map((a) => a.id)).size).toBe(library.length);
    for (const a of library) {
      expect(existsSync(path.join(publicDir, a.src)), a.src).toBe(true);
      expect(categoryLabels[a.category], a.id).toBeTruthy();
    }
  });

  it("у старинной ботаники в CREDITS.md записаны источник и свободная лицензия", () => {
    const botanical = library.filter((a) => a.category === "botanical");
    expect(botanical.length).toBeGreaterThan(0);
    for (const a of botanical) expect(creditRow(`${a.id}.webp`), a.id).toMatch(/\| (CC0|Public domain) \|/);
  });

  it("у каждой сторонней растровой картинки есть строка в CREDITS.md со статусом лицензии", () => {
    const thirdParty = library.filter((a) => a.src.endsWith(".webp") && !IN_HOUSE.includes(a.id));
    expect(thirdParty.length).toBeGreaterThan(20);
    for (const a of thirdParty) expect(creditRow(a.src.replace("/library/", "")), a.id).toMatch(LICENSE);
  });
});

describe("фото-примеры шаблонов", () => {
  it("у каждого файла public/templates есть строка в CREDITS.md со свободной лицензией", () => {
    const files = readdirSync(path.join(publicDir, "templates"));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(creditRow(f), f).toMatch(/\| (CC0|Public domain|Unsplash License) \|/);
  });
});

describe("фоны блока", () => {
  it("у каждой картинки фона есть файл и строка в CREDITS.md со статусом лицензии", () => {
    const srcs = [
      ...Object.values(surfaceTextures).map((t) => t!.src),
      ...Object.values(surfaceObjects).flatMap((o) => [o!.src, ...(o!.kind === "border" && o!.crest ? [o!.crest.src] : [])]),
    ];
    for (const src of srcs) {
      expect(existsSync(path.join(publicDir, src)), src).toBe(true);
      expect(creditRow(src.replace("/library/", "")), src).toMatch(LICENSE);
    }
  });

  it("размер файла предмета совпадает с заявленным (от него считаются нарезка и отступы)", async () => {
    for (const [s, o] of Object.entries(surfaceObjects)) {
      if (o!.kind !== "border" || !o!.size) continue;
      const meta = await sharp(path.join(publicDir, o!.src)).metadata();
      expect([meta.width, meta.height], s).toEqual(o!.size);
    }
  });

  it("каждый фон ровно в одной группе редактора", () => {
    const grouped = surfaceGroups.flatMap((g) => g.items);
    expect([...grouped].sort()).toEqual([...SURFACES].sort());
  });

  it("у каждого фона есть подпись и способ отрисовки", () => {
    for (const s of SURFACES) {
      expect(surfaceLabels[s], s).toBeTruthy();
      if (s === "plain") continue;
      const layer = surfaceLayer(s);
      expect(layer.className || Object.keys(layer.style).length, s).toBeTruthy();
    }
  });
});
