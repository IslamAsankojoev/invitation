// Готовит картинки из new-sources/ (PNG с pngwing.com, лицензии уточняются — см. public/library/CREDITS.md)
// для библиотеки: разрезает составные листы, выравнивает повёрнутые, закрашивает текст, обрезает по альфе,
// уменьшает и сохраняет WebP. Всё детерминированно — перезапуск даёт те же файлы.
//
//   node scripts/new-sources.mjs [фильтр]      фильтр — подстрока id (например, «ticket»)
//
// Координаты в операциях — доли размера исходника (до обрезки): [x0, y0, x1, y1].
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { splitSheet } from "./split-sheet.mjs";

const SRC = "new-sources";
const OUT = "public/library";
const src = (n) => (typeof n === "number" ? `${SRC}/pngwing.com (${n}).png` : `${SRC}/${n}.png`);

// Проверки пикселя для закраски: какой пиксель считать «текстом».
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
const dark = (max) => (r, g, b) => lum(r, g, b) < max;
const notWhite = (r, g, b) => lum(r, g, b) < 248;

/**
 * Задания: out — путь внутри public/library без расширения; from — номер/имя исходника; part — номер элемента
 * составного листа (split-sheet); max — длинная сторона результата; ops — операции по порядку.
 */
const jobs = [
  // ---------- Фоны-предметы: бумага и записки ----------
  { out: "surfaces/sticker-pink", from: 13, part: 1 },
  { out: "surfaces/sticker-clip", from: 13, part: 2 },
  { out: "surfaces/sticker-pin", from: 13, part: 3 },
  { out: "surfaces/sticker-yellow", from: 13, part: 4 },
  { out: "surfaces/sticker-orange", from: 15 },
  { out: "surfaces/sticker-tape", from: 31 },
  { out: "surfaces/note-kraft", from: 14, part: 1 },
  // Тёмные наклонные линейки перечёркивали текст — ослабляем их (остаётся 30%).
  { out: "surfaces/note-lined", from: 14, part: 2, ops: [["inpaint", [0.14, 0.15, 0.95, 0.9], dark(200), 1, 0.3]] },
  { out: "surfaces/note-curl", from: 14, part: 3 },
  { out: "surfaces/note-burlap", from: 14, part: 4 },
  { out: "surfaces/sheet-holes", from: 29, ops: [["deskew"]] },
  { out: "surfaces/sheet-margin", from: 30, ops: [["deskew"]] },
  { out: "surfaces/sheet-torn", from: "torn paper1" },
  { out: "surfaces/note-strip", from: "torn paper2", ops: [["deskew"]] },
  { out: "surfaces/scroll", from: 26 },
  { out: "surfaces/parchment", from: 28 },
  { out: "surfaces/parchment-burnt", from: 27 },
  { out: "surfaces/fabric-lilac", from: 38 },
  { out: "surfaces/label-lilac", from: 52, ops: [["inpaint", [0.1, 0.36, 0.93, 0.62], (r, g) => g < 125, 3]] },
  { out: "surfaces/label-vintage", from: 53 },
  // ---------- Карточки и билеты ----------
  { out: "surfaces/card-clematis", from: 36, ops: [["inpaint", [0.28, 0.32, 0.72, 0.59], notWhite, 2]] },
  {
    out: "surfaces/ticket-admit",
    from: 49,
    ops: [
      ["erase", [0.8, 0, 1, 0.12]],
      ["flatten", [150, 118, 70], 150],
      ["inpaint", [0.245, 0.32, 0.75, 0.675], dark(110), 3],
      ["inpaint", [0.135, 0.32, 0.22, 0.67], dark(110), 3],
      ["inpaint", [0.78, 0.32, 0.865, 0.67], dark(110), 3],
      // Линии корешков: без них между рамками помещается широкий блок (таймер).
      ["inpaint", [0.215, 0.309, 0.243, 0.691], dark(110), 2],
      ["inpaint", [0.752, 0.309, 0.78, 0.691], dark(110), 2],
    ],
  },
  {
    out: "surfaces/ticket-gold",
    from: 50,
    ops: [
      ["keyout"],
      ...[
        [0.275, 0.375, 0.7, 0.445],
        [0.275, 0.445, 0.725, 0.53],
        [0.3, 0.53, 0.7, 0.62],
        [0.215, 0.44, 0.252, 0.535],
        [0.733, 0.44, 0.78, 0.535],
      ].map((rect) => ["inpaint", rect, (r, g) => r - g > 55 && g < 150, 3]),
    ],
  },
  { out: "surfaces/ticket-pink", from: 51, part: 2, ops: [["inpaint", [0.2, 0.15, 0.8, 0.88], (r, g) => g > 185, 3]] },
  {
    out: "surfaces/ticket-stubs",
    from: 51,
    part: 4,
    ops: [
      ["inpaint", [0.18, 0.2, 0.82, 0.8], (r, g) => g > 195, 3],
      ["inpaint", [0.08, 0.15, 0.145, 0.85], (r, g) => g > 195, 3],
      ["inpaint", [0.86, 0.15, 0.925, 0.85], (r, g) => g > 195, 3],
    ],
  },
  // ---------- Рамы ----------
  { out: "surfaces/frame-roses", from: 37 },
  { out: "surfaces/frame-filigree", from: 46, max: 1200 },
  { out: "surfaces/frame-baroque", from: 47 },
  { out: "surfaces/frame-gold", from: 48 },
  // ---------- Тарелки, салфетки, венки ----------
  { out: "surfaces/plate-roses", from: 32 },
  { out: "surfaces/wreath-peony", from: 33 },
  { out: "surfaces/wreath-blue", from: 34 },
  { out: "surfaces/wreath-garden", from: 35 },
  { out: "surfaces/doily-lace", from: 41 },
  { out: "surfaces/doily-pink", from: 42 },
  { out: "surfaces/doily-paper", from: 44 },
  {
    out: "surfaces/doily-kraft",
    from: 45,
    ops: [["inpaint", [0.27, 0.2, 0.74, 0.74], (r, g, b) => r - g > 70 || lum(r, g, b) < 175, 2]],
  },
  // ---------- Украшения ----------
  { out: "hibiscus", from: 16, max: 900 },
  { out: "sakura-branch", from: "sakura", max: 900, ops: [["erase", [0, 0, 0.135, 0.61]]] },
  { out: "wc-blue-strokes", from: 17, max: 900 },
  { out: "wc-turquoise", from: 18, max: 900 },
  { out: "wc-red-stroke", from: 19, max: 900 },
  { out: "wc-pink-blot", from: 20, max: 900 },
  { out: "wc-pink-splash", from: 21, max: 900 },
  { out: "wc-blue-cloud", from: 22, max: 900 },
  { out: "wc-blue-stroke", from: 23, max: 900 },
  { out: "wc-rainbow", from: 24, max: 900 },
  { out: "wc-sky", from: 25, max: 700, ops: [["feather", 0.12]] },
  ...[1, 2, 3, 4].map((part) => ({ out: `ribbon-gold-${part}`, from: 39, part, max: 900 })),
  ...[1, 2].map((part) => ({ out: `ribbon-red-${part}`, from: 40, part, max: 900 })),
  { out: "ribbon-white", from: 43, max: 900 },
];

/** Картинка как RGBA-буфер. */
async function load(file, part) {
  if (part) {
    const parts = await splitSheet(file);
    return raw(sharp(parts[part - 1].png));
  }
  return raw(sharp(file));
}
async function raw(s) {
  const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
const fromRaw = (img) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } });
const box = (img, [x0, y0, x1, y1]) => [Math.round(x0 * img.w), Math.round(y0 * img.h), Math.round(x1 * img.w), Math.round(y1 * img.h)];

/** Рамка непрозрачных пикселей. */
function alphaBox(img, min = 8) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.data[(y * img.w + x) * 4 + 3] <= min) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

const ops = {
  /** Стереть область (надписи на прозрачном фоне, мусор). */
  erase(img, rect) {
    const [x0, y0, x1, y1] = box(img, rect);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.data[(y * img.w + x) * 4 + 3] = 0;
    return img;
  },
  /**
   * Полупрозрачную заливку свести на цвет bg (как она выглядела бы на столе) и сделать плотной:
   * альфа ≥ from → 255, края масштабируются. Шум в альфе становится фактурой бумаги.
   */
  flatten(img, bg, from) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] * a + bg[c] * (1 - a));
      d[i + 3] = Math.min(255, Math.round((d[i + 3] * 255) / from));
    }
    return img;
  },
  /** Убрать белый фон вокруг предмета: малонасыщенные светлые пиксели, связанные с краем (вместе с тенью). */
  keyout(img) {
    const { w, h, data } = img;
    const bg = (i) => {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      return Math.max(r, g, b) - Math.min(r, g, b) < 28 && lum(r, g, b) > 120;
    };
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const i = stack.pop();
      if (seen[i] || !bg(i)) continue;
      seen[i] = 1;
      data[i * 4 + 3] = 0;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
    // Светлая кайма по краю предмета (смесь с белым) — прозрачнее, чем ближе к белому.
    for (let i = 0; i < w * h; i++) {
      if (seen[i]) continue;
      const x = i % w;
      const nearBg = (x > 0 && seen[i - 1]) || (x < w - 1 && seen[i + 1]) || (i >= w && seen[i - w]) || (i < w * (h - 1) && seen[i + w]);
      if (nearBg) data[i * 4 + 3] = Math.round(data[i * 4 + 3] * 0.5);
    }
    return img;
  },
  /**
   * Закрасить текст: пиксели в области, прошедшие test, (+ расширение на grow px) заполняются слоями
   * от краёв средним соседних «чистых» пикселей — на ровной бумаге/заливке следа почти не видно.
   * keep — сколько оставить от исходного пикселя (0 — убрать, 0.3 — ослабить линии).
   */
  inpaint(img, rect, test, grow = 2, keep = 0) {
    const { w, h, data } = img;
    const orig = keep ? Buffer.from(data) : null;
    const [x0, y0, x1, y1] = box(img, rect);
    let mask = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] > 200 && test(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])) mask[i] = 1;
    }
    for (let g = 0; g < grow; g++) {
      const next = mask.slice();
      for (let y = Math.max(1, y0 - grow); y < Math.min(h - 1, y1 + grow); y++) for (let x = Math.max(1, x0 - grow); x < Math.min(w - 1, x1 + grow); x++) {
        const i = y * w + x;
        if (!mask[i] && (mask[i - 1] || mask[i + 1] || mask[i - w] || mask[i + w]) && data[i * 4 + 3] > 200) next[i] = 1;
      }
      mask = next;
    }
    // Послойная заливка: на каждом проходе заполняем пиксели маски, у которых есть известные соседи (8 шт.).
    let left = mask.reduce((a, b) => a + b, 0);
    while (left > 0) {
      const fill = [];
      for (let y = Math.max(1, y0 - grow); y < Math.min(h - 1, y1 + grow); y++) for (let x = Math.max(1, x0 - grow); x < Math.min(w - 1, x1 + grow); x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const acc = [0, 0, 0, 0];
        let n = 0;
        for (const j of [i - 1, i + 1, i - w, i + w, i - w - 1, i - w + 1, i + w - 1, i + w + 1]) {
          // Соседи-«текст» (линии рамки рядом с областью) не годятся в источники — иначе тянется их цвет.
          if (mask[j] || data[j * 4 + 3] < 200 || test(data[j * 4], data[j * 4 + 1], data[j * 4 + 2])) continue;
          for (let c = 0; c < 4; c++) acc[c] += data[j * 4 + c];
          n++;
        }
        if (n >= 2 || (n === 1 && left < 50)) fill.push([i, acc.map((v) => Math.round(v / n))]);
      }
      if (!fill.length) break;
      for (const [i, px] of fill) {
        for (let c = 0; c < 4; c++) data[i * 4 + c] = px[c];
        mask[i] = 0;
      }
      left -= fill.length;
    }
    if (orig) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - keep) + orig[i + c] * keep);
      }
    }
    return img;
  },
  /** Растушевать края: фрагмент, обрезанный прямоугольником (небо), тает к краям на долю r меньшей стороны. */
  feather(img, r) {
    const d = r * Math.min(img.w, img.h);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const t = Math.min(1, Math.min(x, y, img.w - 1 - x, img.h - 1 - y) / d);
      img.data[(y * img.w + x) * 4 + 3] = Math.round(img.data[(y * img.w + x) * 4 + 3] * t * t * (3 - 2 * t));
    }
    return img;
  },
  /** Выровнять повёрнутый лист по верхнему краю (по двум столбцам на 30% и 70% ширины). */
  async deskew(img) {
    const b = alphaBox(img, 128);
    const top = (x) => {
      for (let y = b.y0; y <= b.y1; y++) if (img.data[(y * img.w + x) * 4 + 3] > 128) return y;
      return b.y0;
    };
    const xa = Math.round(b.x0 + (b.x1 - b.x0) * 0.3), xb = Math.round(b.x0 + (b.x1 - b.x0) * 0.7);
    const angle = (Math.atan2(top(xb) - top(xa), xb - xa) * 180) / Math.PI;
    console.log(`   поворот ${(-angle).toFixed(2)}°`);
    return raw(fromRaw(img).rotate(-angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }));
  },
};

const filter = process.argv[2];
mkdirSync(path.join(OUT, "surfaces"), { recursive: true });
for (const job of jobs) {
  if (filter && !job.out.includes(filter)) continue;
  let img = await load(src(job.from), job.part);
  // Большие исходники сначала уменьшаем до рабочего размера (закраска и поворот быстрее).
  const work = (job.max ?? 1000) * 1.6;
  if (Math.max(img.w, img.h) > work) img = await raw(fromRaw(img).resize(Math.round(work), Math.round(work), { fit: "inside" }));
  for (const [name, ...args] of job.ops ?? []) img = await ops[name](img, ...args);
  const b = alphaBox(img);
  const pad = 2;
  const left = Math.max(0, b.x0 - pad), top = Math.max(0, b.y0 - pad);
  const width = Math.min(img.w, b.x1 + 1 + pad) - left, height = Math.min(img.h, b.y1 + 1 + pad) - top;
  const max = job.max ?? 1000;
  const file = path.join(OUT, `${job.out}.webp`);
  const info = await fromRaw(img)
    .extract({ left, top, width, height })
    .resize(max, max, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90, effort: 6 })
    .toFile(file);
  console.log(`${file}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} КБ`);
}
