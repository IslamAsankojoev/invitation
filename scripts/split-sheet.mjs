// Разрезает прозрачный PNG с несколькими элементами (лист стикеров, набор лент) на отдельные картинки
// по альфа-каналу: маска → «расширение» (чтобы тень/скотч не отвалились) → связные области → bbox.
//
//   node scripts/split-sheet.mjs <in.png> <outDir> [join=0.01] [minArea=0.01]
//
// join — радиус склейки в долях длинной стороны (больше — близкие части сольются в один элемент),
// minArea — области меньше этой доли площади крупнейшей считаются мусором.
// Файлы: <outDir>/<имя>-1.png, -2.png… в порядке чтения (строки сверху вниз, в строке слева направо).
// Пиксели соседних элементов, попавшие в рамку, становятся прозрачными.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

/** Элементы листа: [{ left, top, width, height, png: Buffer }] в порядке чтения. */
export async function splitSheet(input, { join = 0.01, minArea = 0.01, alpha = 16, pad = 4 } = {}) {
  const meta = await sharp(input).metadata();
  // Метки считаем на уменьшенной маске: листы бывают по 8000 px.
  const scale = Math.min(1, 1000 / Math.max(meta.width, meta.height));
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
  const small = await sharp(input).ensureAlpha().resize(w, h, { kernel: "nearest" }).extractChannel(3).raw().toBuffer();

  // Расширение маски квадратом радиуса r (два прохода: по строкам и по столбцам).
  const r = Math.max(1, Math.round(join * Math.max(w, h)));
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = small[i] > alpha ? 1 : 0;
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on[y * w + x]) continue;
    for (let dx = Math.max(0, x - r); dx <= Math.min(w - 1, x + r); dx++) rows[y * w + dx] = 1;
  }
  const grown = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    if (!rows[y * w + x]) continue;
    for (let dy = Math.max(0, y - r); dy <= Math.min(h - 1, y + r); dy++) grown[dy * w + x] = 1;
  }

  // Связные области (4-связность) — заливка стеком.
  const label = new Int32Array(w * h);
  const parts = [];
  for (let s = 0; s < w * h; s++) {
    if (!grown[s] || label[s]) continue;
    const id = parts.length + 1;
    const box = { id, x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    const stack = [s];
    label[s] = id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w, y = (i / w) | 0;
      if (on[i]) {
        box.area++;
        box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
      }
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && grown[j] && !label[j]) { label[j] = id; stack.push(j); }
      }
    }
    parts.push(box);
  }
  const maxArea = Math.max(...parts.map((p) => p.area));
  const keep = parts.filter((p) => p.area >= maxArea * minArea);

  // Порядок чтения: элементы, чьи центры по вертикали в пределах половины высоты, — одна строка.
  keep.sort((a, b) => a.y0 - b.y0);
  const lines = [];
  for (const p of keep) {
    const cy = (p.y0 + p.y1) / 2;
    const line = lines.find((l) => Math.abs(l.cy - cy) < (p.y1 - p.y0) / 2);
    if (line) line.items.push(p); else lines.push({ cy, items: [p] });
  }
  const ordered = lines.flatMap((l) => l.items.sort((a, b) => a.x0 - b.x0));

  const full = await sharp(input).ensureAlpha().raw().toBuffer();
  const W = meta.width, H = meta.height;
  const out = [];
  for (const p of ordered) {
    const left = Math.max(0, Math.floor(p.x0 / scale) - pad), top = Math.max(0, Math.floor(p.y0 / scale) - pad);
    const right = Math.min(W, Math.ceil((p.x1 + 1) / scale) + pad), bottom = Math.min(H, Math.ceil((p.y1 + 1) / scale) + pad);
    const cw = right - left, ch = bottom - top;
    const buf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const si = ((top + y) * W + left + x) * 4, di = (y * cw + x) * 4;
      const sx = Math.min(w - 1, Math.floor((left + x) * scale)), sy = Math.min(h - 1, Math.floor((top + y) * scale));
      const l = label[sy * w + sx];
      // Чужая область — прочь; фон (l = 0) оставляем как есть (там и так прозрачно или край тени).
      if (l && l !== p.id) continue;
      full.copy(buf, di, si, si + 4);
    }
    const png = await sharp(buf, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
    out.push({ left, top, width: cw, height: ch, png });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , input, outDir, join = "0.01", minArea = "0.01"] = process.argv;
  mkdirSync(outDir, { recursive: true });
  const parts = await splitSheet(input, { join: +join, minArea: +minArea });
  const base = path.basename(input, path.extname(input));
  for (const [i, p] of parts.entries()) {
    const file = path.join(outDir, `${base}-${i + 1}.png`);
    await sharp(p.png).toFile(file);
    console.log(`${file}  ${p.width}×${p.height} @ ${p.left},${p.top}`);
  }
}
